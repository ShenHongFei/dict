import type { Dispatch } from 'react'
import { request_json } from 'MyNet.browser'

export class Dict {
    static mode: 'desktop' | 'mobile' = window.innerWidth > 700 ? 'desktop' : 'mobile'
    
    static items: Item[] = []
    static items_hook: Dispatch<Item[]>
    
    static item: Item
    static item_hook: Dispatch<Item>
    
    static index: string
    
    static cache = { }
    
    static last_search: Date = new Date()
    
    // ------------ elements
    static input: HTMLInputElement
    
    static side: HTMLDivElement
    
    static main: HTMLDivElement
    
    static get head () { return this.input.parentElement }
    
    /** 当前激活元素 */
    static focus: HTMLElement
    
    static BORDER_NORMAL_COLOR = '#cccccc'
    
    static BORDER_ACTIVE_COLOR = '#666666'
    
    static async search (index: string = this.input.value) {
        if (!index) {
            this.set_item(null)
            return
        }
        
        const this_search = new Date()
        if (this_search.getTime() - this.last_search.getTime() < 200) {
            this.search_google()
            this.last_search = this_search
            return
        }
        
        this.index = index
        history.pushState(null, `${index} - Dict`, `#${index},0`)
        if (this.cache[index])
            this.set_items(this.cache[index])
        else {
            const items_data = await request_json<Partial<Item>[]>('search', { queries: { index } })
            const items = items_data.map( (item, i) => new Item(item, i))
            this.set_items(this.cache[index] = items)
            console.log('search: ' + index)
        }
        
        this.set_item(this.items[0])
        
        this.last_search = this_search
        
        this.side.focus()
    }
    
    static set_items (items: Item[]) {
        this.items_hook(this.items = items)
    }
    
    
    static set_item (item: Item) {
        this.item_hook(this.item = item)
    }
    
    
    static select_item (item: Item) {
        this.set_item(item)
        history.replaceState(null, `${item.index} - Dict`, `#${this.index},${item.i}`)
    }
    
    
    static select_item_i (i: number) {
        this.side.focus()
        if (0 <= i && i < this.items.length)
            this.select_item(this.items[i])
    }
    
    
    static jump (event: any) {
        const matches = event.target.href?.match('^entry://([^#]+)')
        if (!matches?.[1]) return
        this.search(this.input.value = matches[1])
    }
    
    
    static next () {
        this.side.focus()
        if (!this.item) return
            this.select_item_i(this.item.i + 1)
    }
    
    
    static back () {
        history.back()
    }
    
    static forward () {
        history.forward()
    }
    
    static previous () {
        this.side.focus()
        if (!this.item) return
        this.select_item_i(this.item.i - 1)
    }
    
    
    static clear () {
        this.input.value = ''
    }
    
    
    static register () {
        window.Dict = this
        this.register_shortcuts()
        this.register_onfocus()
        this.register_hashchange()
    }
    
    
    static register_shortcuts () {
        document.addEventListener('keydown', (event)=> {
            const { key, target } = event
            
            const ctrl = event.getModifierState('Control')
            const alt  = event.getModifierState('Alt')
            
            if (key === 'Escape') {
                event.preventDefault()
                this.input.value = ''
                this.input.focus()
                return
            }
            
            if (key === 'Enter' && this.focus === this.side && this.input.value) {
                this.search_google()
                return
            }
            
            if (key === 'Enter' && target === this.input) {
                this.search((target as HTMLInputElement).value)
                return
            }
            
            if (target === this.input || ctrl || alt) return
            
            if (key.match(/^[1-9]$/)) {
                event.preventDefault()
                this.select_item_i(Number(key) - 1)
                return
            }
            
            if (key === 's' || key === 'f') {
                event.preventDefault()
                const selection_text = window.getSelection().toString()
                this.input.value = selection_text
                if (selection_text)
                    this.search(selection_text)
                else
                    this.input.focus()
                return
            }
            
            if (key === 'e') {
                event.preventDefault()
                this.input.focus()
                return
            }
                
            
            if (key === 'j') {
                event.preventDefault()
                this.main.focus()
                this.main.scrollTop += 80
                return
                
            }
                
            if (key === 'J') {
                event.preventDefault()
                this.main.focus()
                this.main.scrollTop = 1e5
                return
                
            }
            
            if (key === 'k') {
                event.preventDefault()
                this.main.focus()
                this.main.scrollTop -= 80
                return
                
            }
            
            if (key === 'K') {
                this.main.focus()
                this.main.scrollTop = 0
                return
            }
            
            
            if (key === 'h' || key === 'd') {
                event.preventDefault()
                history.go(-1)
                return
            }
            
            if (key === 'l' || key === 'g') {
                event.preventDefault()
                history.go(1)
                return
            }
            
            
            if (!event.shiftKey && key === 'Tab') {
                event.preventDefault()
                this.next()
                return
            }
            
            if (event.shiftKey && key === 'Tab') {
                event.preventDefault()
                this.previous()
                return
            }
        })
    }
    
    static search_google (index = this.input.value) {
        window.open('https://www.google.com/search?q=' + index, '_blank')
    }
    
    
    static register_hashchange () {
        window.addEventListener('hashchange', (event) => {
            console.log('hashchange')
            let [index, i] = event.newURL.split('#')[1]?.split(',') || []
            if (i === undefined) return
            index = decodeURIComponent(index)
            if (!this.cache[index]) return
            this.set_index(index)
            this.set_items(this.cache[this.index])
            this.set_item(this.items[i])
        })
    }
    
    
    /** 激活状态显示切换 */
    static register_onfocus () {
        // --- head focus
        this.input.onfocus = event => {
            if (this.mode === 'desktop') {
                this.head.style.borderColor = this.BORDER_ACTIVE_COLOR
                
                this.side.style.borderTopColor    = this.BORDER_ACTIVE_COLOR
                this.side.style.borderBottomColor = this.BORDER_NORMAL_COLOR
                this.side.style.borderLeftColor   = this.BORDER_NORMAL_COLOR
                this.side.style.borderRightColor  = this.BORDER_NORMAL_COLOR
                
                this.main.style.borderTopColor    = this.BORDER_ACTIVE_COLOR
                this.main.style.borderRightColor  = this.BORDER_NORMAL_COLOR
                this.main.style.borderBottomColor = this.BORDER_NORMAL_COLOR
            } else {
                this.head.style.borderTopColor    = this.BORDER_ACTIVE_COLOR
                this.head.style.borderLeftColor   = this.BORDER_ACTIVE_COLOR
                this.head.style.borderRightColor  = this.BORDER_ACTIVE_COLOR
                this.head.style.borderBottomColor = this.BORDER_ACTIVE_COLOR
                
                this.side.style.borderTopColor    = this.BORDER_NORMAL_COLOR
                this.side.style.borderLeftColor   = this.BORDER_NORMAL_COLOR
                this.side.style.borderRightColor  = this.BORDER_NORMAL_COLOR
                
                this.main.style.borderTopColor    = this.BORDER_NORMAL_COLOR
                this.main.style.borderLeftColor   = this.BORDER_NORMAL_COLOR
                this.main.style.borderRightColor  = this.BORDER_NORMAL_COLOR
                this.main.style.borderBottomColor = this.BORDER_NORMAL_COLOR
            }
            
            this.focus = this.input
        }
        
        // --- side focus
        this.side.onfocus = event => {
            if (this.mode === 'desktop') {
                this.head.style.borderColor = this.BORDER_NORMAL_COLOR
                
                this.side.style.borderTopColor    = this.BORDER_ACTIVE_COLOR
                this.side.style.borderBottomColor = this.BORDER_ACTIVE_COLOR
                this.side.style.borderLeftColor   = this.BORDER_ACTIVE_COLOR
                this.side.style.borderRightColor  = this.BORDER_ACTIVE_COLOR
                
                this.main.style.borderTopColor    = this.BORDER_NORMAL_COLOR
                this.main.style.borderRightColor  = this.BORDER_NORMAL_COLOR
                this.main.style.borderBottomColor = this.BORDER_NORMAL_COLOR
            } else {
                this.head.style.borderTopColor    = this.BORDER_ACTIVE_COLOR
                this.head.style.borderLeftColor   = this.BORDER_NORMAL_COLOR
                this.head.style.borderRightColor  = this.BORDER_NORMAL_COLOR
                this.head.style.borderBottomColor = this.BORDER_NORMAL_COLOR
                
                this.side.style.borderTopColor    = this.BORDER_ACTIVE_COLOR
                this.side.style.borderLeftColor   = this.BORDER_ACTIVE_COLOR
                this.side.style.borderRightColor  = this.BORDER_ACTIVE_COLOR
                
                this.main.style.borderTopColor    = this.BORDER_NORMAL_COLOR
                this.main.style.borderLeftColor   = this.BORDER_NORMAL_COLOR
                this.main.style.borderRightColor  = this.BORDER_NORMAL_COLOR
                this.main.style.borderBottomColor = this.BORDER_NORMAL_COLOR
            }
            
            
            this.focus = this.side
        }
        
        // --- main focus
        this.main.onfocus = event => {
            if (this.mode === 'desktop') {
                this.head.style.borderColor = this.BORDER_NORMAL_COLOR
                
                this.side.style.borderTopColor    = this.BORDER_NORMAL_COLOR
                this.side.style.borderBottomColor = this.BORDER_NORMAL_COLOR
                this.side.style.borderLeftColor   = this.BORDER_NORMAL_COLOR
                this.side.style.borderRightColor  = this.BORDER_ACTIVE_COLOR
                
                this.main.style.borderTopColor    = this.BORDER_ACTIVE_COLOR
                this.main.style.borderRightColor  = this.BORDER_ACTIVE_COLOR
                this.main.style.borderBottomColor = this.BORDER_ACTIVE_COLOR
            } else {
                this.head.style.borderTopColor    = this.BORDER_NORMAL_COLOR
                this.head.style.borderLeftColor   = this.BORDER_NORMAL_COLOR
                this.head.style.borderRightColor  = this.BORDER_NORMAL_COLOR
                this.head.style.borderBottomColor = this.BORDER_NORMAL_COLOR
                
                this.side.style.borderTopColor    = this.BORDER_ACTIVE_COLOR
                this.side.style.borderLeftColor   = this.BORDER_NORMAL_COLOR
                this.side.style.borderRightColor  = this.BORDER_NORMAL_COLOR
                
                this.main.style.borderTopColor    = this.BORDER_ACTIVE_COLOR
                this.main.style.borderLeftColor   = this.BORDER_ACTIVE_COLOR
                this.main.style.borderRightColor  = this.BORDER_ACTIVE_COLOR
                this.main.style.borderBottomColor = this.BORDER_ACTIVE_COLOR
            }
            
            this.focus = this.main
        }
    }
    
    
    static set_index (index: string) {
        this.index = index
        this.input.value = index
    }
}


export class Item {
    index: string
    
    type?: 'EN_OALD' | 'JP_JTS' | 'JP_GRAMMAR'
    
    _id?: any
    
    content: string
    
    origin?: string
    
    word_root?: string
    
    assets?: { [key: string]: string }
    
    proncs: string[]
    
    // --- 添加的属性
    i: number
    
    
    constructor (data: Partial<Item>, i: number) {
        this.i = i
        Object.assign(this, data)
    }
    
    render () {
        if (this.type === 'JP_JTS')
            return '<h1 class="index">' + this.index + '</h1>' + this.content
        
        // ------------ this.type === 'EN_OALD'
        let $dom = $load(this.content)
        
        $dom.find('img').attr('src', (i, src) => 'data:image/' + src.split('.').pop() + ';base64,' + this.assets[src.slice(1)])
        
        // ---  去除英音
        $dom.find('[resource="phon-gb"]').remove()
        $dom.find('.phon-gb').remove()
        $dom.find('[resource="uk_pron"]').remove()
        
        // --- 单词语音
        $dom.find('a[type="sound"]').each( (i, e) => {
            let $e = $(e)
            const asset_key = 'proncs/' + $e.attr('href').split('/').pop()
            $e.replaceWith(`<span id="audio-${i}" onclick="Dict.item.play_spx(${asset_key.quote()})" style="cursor:pointer">▶</span>`)
            if (i === 0)
                this.play_spx(asset_key)
        })
        
        if (this.origin) {
            let $origin = $load(this.origin)
            $($origin.find('object')[1]).attr('data', (i, link) => 'http://www.dicts.cn' + link)
            $dom.append($origin.html())
        }
        
        if (this.word_root) {
            const word_root = this.word_root
                .rm(/来自.*?\*/g)
                .rm(/PIE\*/g)
                .space()
                .replace(/[.。]/g, '<br>')
                
            $dom.find('.h').after(`<div class='word-root'>${word_root}</div>`)
        }
        
        return $dom.html()
    }
    
    
    play_spx (asset_key: string) {
        const { Speex } = window
        // 测试 spx base64 字符串位于 spx_test.txt 文件
        const spx = atob(this.assets[asset_key])
        const [samples, header] = Speex.decodeFile(spx)
        Speex.util.play(samples, header.rate)
    }
    
    click (event: React.MouseEvent<HTMLDivElement, MouseEvent>) {
        if ((event.target as HTMLElement).tagName === 'A') {
            const a = event.target as HTMLAnchorElement
            if (a.href.startsWith('entry://')) {
                const index = a.href.rm('entry://')
                Dict.input.value = index
                Dict.search(index)
                return
            }
        }
    }
}


export interface Grammar extends Item {
    id: number
    
    index: string
    
    type: 'JP_GRAMMAR'
    
    /** 语法级别  */
    level?: 'N1' | 'N2' | 'N3' | 'N4' | 'N5' | '+收藏'
    
    range?: string
    
    contents: {
        explainations: {
            cn?: string[]
            jp?: string[]
        }
        continuation: string
        meaning: string
        situation: string
        sentences: string[]
        notes: string
        confusion?: string
    }[]
    
    synonyms: string[]
    
    related_words: { index: string }[]
}

function $load (html: string) {
    return $($.parseHTML((html || '').surround_tag('div'), true))
}

export default Dict
