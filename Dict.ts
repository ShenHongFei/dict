
import uniq_by from 'lodash/uniqBy'

import { fread } from 'MyFile'
import db from 'MyDB'
import { Db as MongoDB, Collection } from 'mongodb'

export default class Dict {
    static db: MongoDB
    
    static en: Collection
    static en_proncs: Collection
    static ja: Collection
    
    static grammars: { [id: string]: Grammar }
    
    static assets_cache: { [key: string]: string } = { }
    
    static LEVEL_PATTERN = /^N[1-5]$/i
    
    static LIMIT = 100
    
    static async init () {
        this.db = db.client.db('dict')
        
        this.en = this.db.collection('en')
        this.en_proncs = this.db.collection('en_proncs')
        this.ja = this.db.collection('jp')
        
        this.grammars = ( await import(`${global.ROOT}/Dict/grammars.json`) ).default
    }
    
    static async search_db (collection: Collection, pattern: string, isStartsWith = true): Promise<Item[]> {
        return await collection.find({
            index: {
                $regex: (isStartsWith ? '^' : '') + pattern,
                $options: 'i'
            }
        }, {
            limit: this.LIMIT,
            batchSize: this.LIMIT
        }).toArray()
    }
    
    
    static search_grammars (index: string) {
        const grammar_entries = Object.entries(this.grammars)
        let grammars: Grammar[] = [ ]
        
        // --- 按 level 学习
        if (this.LEVEL_PATTERN.test(index))
            grammars = grammar_entries
                .filter( ([id, grammar]) => grammar.level === index)
                .map( ([id, grammar]) => grammar)
        
        // --- 按分类学习
        if (!grammars.length && this.GRAMMAR_CATEGOREIS.has(index))
            grammars = grammar_entries
                .filter( ([id, grammar]) =>
                    grammar.contents.map( g => g.situation).some( situation => situation === index)
                )
                .map( ([id, grammar]) => grammar)
        
        // --- 查询语法
        if (!grammars.length) {
            const pattern = new RegExp(index, 'i')
            grammars = grammar_entries
                .filter( ([id, grammar]) => pattern.test(grammar.index))
                .map( ([id, grammar]) => grammar)
                .slice(0, this.LIMIT)
        }
        
        grammars.forEach( grammar => { grammar.type = 'JP_GRAMMAR' })
        
        return grammars
    }
    
    
    static async search (index = '', { is_load_assets = true } = { }) {
        index = index.trim()
        
        // ------------ 查询英语单词，搜索 《OALD 牛津高阶英汉双解词典》（第8版）
        // eslint-disable-next-line no-control-regex
        if (/^[\x00-\x7F]*$/.test(index) && !this.LEVEL_PATTERN.test(index)) {
            let items: Item[] = await this.search_db(this.en, index)
            
            if (!is_load_assets) return items
            
            // --- 加载资源
            await Promise.all( items.map( async item => {
                item.type = 'EN_OALD'
                
                // --- 根据链接获取图片资源
                item.assets = { }
                for (const line of item.content.split_lines()) {
                    const matches = /.*src="\/(symbols|pic|thumb)\/(.+?)\.(.+?)"/i.exec(line)
                    if (!matches) continue
                    
                    const asset_key = matches[1] + '/' + matches[2] + '.' + matches[3]
                    
                    // 已存在
                    if (asset_key in item.assets) continue
                    
                    // 缓存命中
                    if (asset_key in this.assets_cache) {
                        item.assets[asset_key] = this.assets_cache[asset_key]
                        continue
                    }
                    
                    try {
                        const img_buf = await fread(global.ROOT + 'Dict/OALD/' + asset_key, { encoding: 'BINARY', print: false })
                        this.assets_cache[asset_key] = item.assets[asset_key] = img_buf.toString('base64')
                    } catch (error) {
                        if (error.code === 'ENOENT') {
                            console.error('ENOENT:', index, asset_key)
                            return
                        }
                        throw error
                    }
                }
                
                // --- 加载发音（美音），加入 assets
                await Promise.all(
                    item.proncs.map( pronc => 
                        this.en_proncs.findOne({ index: pronc }).then( proncDoc => {
                            // new Buffer pronc_doc.spx.value() 是错误的方法
                            item.assets[`proncs/${pronc}.spx`] = proncDoc.spx.buffer.toString('base64')
                        })
                ))
            }))
            
            return items
            
            
        // ------------ 查询日语语法或单词
        } else {
            // --- 语法
            const grammars = this.search_grammars(index)
            
            // --- 講談社日中辞典 JTS
            const items = await Promise.all(
                uniq_by(
                    (await Promise.all([this.search_db(this.ja, index), this.search_db(this.ja, index, false)])).flat(),
                    item => item._id.toString()
                )
                .slice(0, this.LIMIT)
                .map( async item => {
                    const first_line = item.content.split_lines()[0]
                    const LINK_PATTERN = '@@@LINK='
                    
                    if (first_line.startsWith(LINK_PATTERN)) {
                        const real_index = first_line.rm(LINK_PATTERN)
                        item = await this.ja.findOne({ index: real_index })
                    }
                    
                    item.type = 'JP_JTS'
                    
                    return item
                })
            )
            
            return [ ...grammars, ...uniq_by(items, item => item._id.toString()) ]
        }
    }
    
    
    static GRAMMAR_CATEGOREIS = new Set([
        '逆接条件',
        '並列',
        '時点・場面',
        '例示',
        '主張・断定',
        '決定',
        '経過・結末',
        '授受',
        '様子・状態',
        '.',
        '軽重の強調',
        '基準',
        '時間的前後',
        '関連・対応',
        '可能・難易',
        '対象',
        '原因・理由',
        '相関関係',
        '判断の立場',
        '非限定',
        '変化・不定',
        '程度',
        '対比',
        '逆接・譲歩',
        '無関係・除外',
        '進行',
        '付加',
        '手段・媒介',
        '其它',
        '敬意',
        '習慣・反復・職業・身分',
        '経験',
        '依頼',
        '意図的行為・動作の開始と終了',
        '前置き・和らげ',
        '限定',
        '限界',
        '心情の強調',
        '方向性',
        '順次',
        '継続',
        '付帯状態・非付帯状態',
        '傾向',
        '比況',
        '願望',
        '起点・終点',
        '範囲',
        '説明',
        '言い換え',
        '納得',
        '比較',
        '感嘆',
        '同意・確認',
        '目的',
        '反復',
        '命令',
        '条件',
        '禁止',
        '反実仮想',
        '勧誘',
        '判断',
        '助言',
        '話題',
        '部分否定',
        '不必要',
        '許可',
        '移動の状態',
        '引用',
        '受け身・使役受け身',
        '意志',
        '使役',
        '申し出',
        '強制',
        '否定',
        '強調',
        '伝聞',
        '名前の紹介',
        '評価の視点',
        '婉曲',
        '義務',
    ])
}


interface Item {
    type?: 'EN_OALD' | 'JP_JTS' | 'JP_GRAMMAR'
    
    index: string
    
    _id?: any
    
    content: string
    
    assets?: { [key: string]: string }
    
    proncs: string[]
}


interface Grammar extends Item {
    id: number
    
    index: string
    
    type?: 'JP_GRAMMAR'
    
    /** 语法级别  */
    level?: 'N1' | 'N2' | 'N3' | 'N4' | 'N5' | '+收藏'
    
    range?: string
    
    contents: ({
        situation: string
        explainations: {
            cn: string[]
        }
        notes: string
    } | {
        continuation: string
        meaning: string
        situation: string
        sentences: string[]
        notes: string
    })[]
}



