/* eslint-disable no-irregular-whitespace */
import './index.styl'

import '../lib/MyPrototype.browser'

import { default as React, useState, useEffect, useRef } from 'react'
import { render } from 'react-dom'

import { Dict } from './Dict.browser'
import type { Grammar } from './Dict.browser'

declare global {
    interface Window {
        Speex: {
            decodeFile (file: string): [/** samples */any, /** header */any]
            util: {
                play (samples: any, rate: number)
            }
        }
        
        Dict: Dict
    }
}



main()

async function main () {
    window.addEventListener('load', async () => {
        const registration = await navigator.serviceWorker.register('service-worker.js')
    })
    
    
    render(<Dictionary/>, document.querySelector('.root'))
}

function Dictionary () {
    let input = useRef<HTMLInputElement>()
    
    useEffect(() => {
        Dict.input = input.current
        Dict.register()
    })
    
    
    return <div className={ Dict.mode }>
        {/* ------------ head */}
        <div className='head'>
            <input className='input' ref={input} type='text' tabIndex={1} placeholder='输入单词（英语／日语）' />
            <div className='button' onClick={ () => Dict.search() } />
        </div>
        
        {/* ------------ side */}
        <Side/>
        
        {/* ------------ main */}
        <ItemContent/>
    </div>
}

function Side () {
    Dict.items_hook = useState(Dict.items)[1]
    
    let side = useRef<HTMLDivElement>()
    useEffect(() => {
        Dict.side = side.current
    })
    
    return <div className='side' tabIndex={2} ref={side}>
        {
            Dict.items.map( (item, i) => 
                <div className='index' onClick={ () => Dict.select_item(item) } key={i}>
                    <span className='i'>{ item.i + 1 <= 9  ?  String(item.i + 1) : '' }</span>
                    <span className='text'>{item.index}</span>
                </div>)
        }
        <div className='buttons'>
            <svg className="icon-back" onClick={ () => Dict.back() } viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="2133" width="512" height="512"><path d="M957.046154 452.923077H303.261538c-17.723077 0-25.6-21.661538-13.784615-33.476923l189.046154-189.046154c11.815385-11.815385 11.815385-29.538462 0-41.353846l-43.323077-43.323077c-11.815385-11.815385-29.538462-11.815385-41.353846 0L49.230769 492.307692c-11.815385 11.815385-11.815385 29.538462 0 41.353846L393.846154 878.276923c11.815385 11.815385 29.538462 11.815385 41.353846 0l41.353846-41.353846c11.815385-11.815385 11.815385-29.538462 0-41.353846l-189.046154-189.046154c-11.815385-13.784615-3.938462-35.446154 13.784616-35.446154h653.784615c15.753846 0 29.538462-11.815385 29.538462-27.569231v-59.076923c0-15.753846-11.815385-31.507692-27.569231-31.507692z" p-id="2134" fill="#8a8a8a"></path></svg>
            <svg className="icon-forward" onClick={ () => Dict.forward() } viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="3480" width="512" height="512"><path d="M66.953846 571.076923h653.784616c17.723077 0 25.6 21.661538 13.784615 33.476923l-189.046154 189.046154c-11.815385 11.815385-11.815385 29.538462 0 41.353846l43.323077 43.323077c11.815385 11.815385 29.538462 11.815385 41.353846 0L974.769231 531.692308c11.815385-11.815385 11.815385-29.538462 0-41.353846L630.153846 145.723077c-11.815385-11.815385-29.538462-11.815385-41.353846 0l-41.353846 41.353846c-11.815385 11.815385-11.815385 29.538462 0 41.353846l189.046154 189.046154c11.815385 13.784615 3.938462 35.446154-13.784616 35.446154H68.923077c-15.753846 0-29.538462 11.815385-29.538462 27.569231v59.076923c0 15.753846 11.815385 31.507692 27.569231 31.507692z" p-id="3481" fill="#8a8a8a"></path></svg>
        </div>
    </div>
}

function ItemContent () {
    const item = Dict.item
    Dict.item_hook = useState(Dict.item)[1]
    
    let main = useRef<HTMLDivElement>()
    useEffect(() => {
        Dict.main = main.current
    })
    
    if (!item)
        return <div className='main' ref={main} tabIndex={3}>
            <h2>Dict</h2>
            <pre dangerouslySetInnerHTML={{ __html: Dict.mode === 'desktop' ? (
                    '<b>快捷键：</b>\n\n' +
                    '    <b>全局</b>\n' +
                    '        Esc 聚焦输入框并清空\n' +
                    '    \n' +
                    '    <b>焦点位于输入框</b>\n' +
                    '        Enter       查询单词 （正则表达式）\n' +
                    '        Enter × 2   Google Search\n' +
                    '    \n' +
                    '    <b>焦点不位于输入框</b>\n' +
                    '    (大写字母表示按住 Shift + 相应按键)\n' +
                    '    \n' +
                    '        tab/TAB       下一个／上一个 条目\n' +
                    '        e             聚焦输入框，并编辑查询内容（不清空）\n' +
                    '        f 或 s        聚焦输入框，并输入查询内容（清空），若当前有选中内容则直接搜索\n' +
                    '        j/J           向下滚动／直达底部\n' +
                    '        k/K           向上滚动／直达顶部\n' +
                    '        d 或 h        后退，转到上一个历史查询词条\n' +
                    '        g 或 l        前进，转到下一个历史查询词条\n' +
                    '        1 - 9         切换至对应编号条目\n' +
                    '        \n' +
                    '        \n' +
                    '    \n' +
                    '    <b>源码</b>\n' +
                    '        <a href="https://github.com/ShenHongFei/Dict" target="_blank">https://github.com/ShenHongFei/Dict</a>'
                    )
                :
                    '输入单词后点击搜索图标或回车即可搜索词条，大概需要 10 秒钟返回结果\n\n' +
                    '<b>源码</b>\n' +
                    '    <a href="https://github.com/ShenHongFei/Dict" target="_blank">https://github.com/ShenHongFei/Dict</a>'
            }} />
        </div>
    
    
    if (item.type !== 'JP_GRAMMAR')
        return <div className={ 'main ' + item.type } ref={main}
            tabIndex={3} 
            onClick={ event => item.click(event) }
            dangerouslySetInnerHTML={{ __html: item.render() }}
        />
    
    const grammar = item as Grammar
    
    return <div className='main JP_GRAMMAR' ref={main} tabIndex={3} onClick={ event => item.click(event) }>
        <h1 className='index'>{grammar.index}</h1>
        <p><span className='level'>【レベル】 {grammar.level}</span></p>
        { grammar.contents.map( (content, i) => 
            <div className='content' key={i}>
                { grammar.contents.length > 1 && 
                    <p className='item_index'>({i+1})</p> }
                
                { content.meaning && 
                    <p className='meaning'>【意味】 {content.meaning}</p> }
                
                { content.situation && 
                    <p className='situation'>【場合】 {content.situation}</p> }
                
                { content.continuation && 
                    <p className='situation'>【継続】 {content.continuation}</p> }
                
                { content.sentences?.length > 0 && 
                    <div className='sentences'>
                        <p>【例文】</p>
                        { content.sentences.map( (sentence, i) => 
                            <p className='sentence' key={i} dangerouslySetInnerHTML={{ __html: 
                                sentence
                                    .replace(/\//g, '　／　')
                                    .replace(/Ｂ/g, '<br>&nbsp;&nbsp;&nbsp;Ｂ')
                                    .replace(/B：/g, '<br>&nbsp;&nbsp;&nbsp;B：')
                                    .replace(/A:/g, 'A：')
                                    .replace(/／　A：/g, '<br>&nbsp;&nbsp;&nbsp;A：')
                            }}></p>
                        ) }
                        <br/>
                    </div> }
                
                { Object.keys(content.explainations || { }).length > 0 && 
                    <div className='sentences'>
                        <p>【説明】</p>
                        { content.explainations.jp?.map( (exp, i) => 
                            <p className='sentence' key={'jp-' + i} dangerouslySetInnerHTML={{ __html: 
                                exp
                                    .replace(/◆/g, '<br>◆')
                                    .replace(/×/g, '✘ ')
                                    .replace(/→/g, '<br>→')
                                    .replace(/○/g, '○ ')
                                    .replace(/◆([^✘])/g, '◆ $1')
                            }}/>
                        ) }
                        { content.explainations.jp && <br/> }
                        { content.explainations.cn?.map( (exp, i) => <p key={'cn-' + i} className='sentence'>{exp}</p> ) }
                        <br/>
                    </div> }
                
                { content.notes && <div className='notes'>
                    <p>【注意】</p>
                    <p dangerouslySetInnerHTML={{ __html: content.notes.replace(/([①-⑩])/g, "<br>$1 ").replace(/^<br>/, '') }}/>
                    <br/>
                </div> }
                
                { content.confusion && <div className='confusion'>
                    <p>【分け方】</p>
                    <pre>{content.confusion}</pre>
                    <br/>
                </div> }
            </div>
        ) }
        
        { grammar.synonyms && <div className='synonyms'>
            <p>【シソーラス】</p>
            <p dangerouslySetInnerHTML={{ __html: grammar.synonyms.join('<br>') }}/>
            <br/>
        </div> }
        
        { grammar.related_words && <div className='related_words'>
            <p>【関連語彙】</p>
            { grammar.related_words.map( (word, i) => <p key={i}>{word.index}</p> ) }
            <br/>
        </div> }
    </div>
}
