<template lang="pug">
    .Dict
        .head
            input.input(type='text' tabindex='0')
            input.button(type='button' @click='search(input.value)')
        
        .side(tabindex='1')
            .item(v-for='item in items')
                h6.index(@click='select_item(item)')
                    span.i {{item.i + 1 <= 9  ?  (item.i+1+' ')  :  '&nbsp;'}}
                    | {{item.index}}
        
        .main(v-if='!item' tabindex='2')
            h2 iDict
            pre.
                <b>快捷键（全程无需鼠标）</b>
                
                <b>全局</b>
                    Esc 聚焦输入框并清空
                
                <b>焦点位于输入框</b>
                    Enter 查询单词 （正则表达式）
                
                <b>焦点不位于输入框</b>
                    Tab           下一条目
                    Shift+Tab     上一条目
                    e             聚焦输入框编辑查询内容（不清空）
                    f 或 s        聚焦输入框输入查询内容（清空）
                    j/J           向下滚动／直达底部
                    k/K           向上滚动／直达顶部
                    h             后退，转到上一个历史查询词条
                    l             前进，转到下一个历史查询词条
                    Enter (双击)  Google Search
                    1 - 9         切换至对应编号条目
                    
                    (大写字母表示按住 Shift + 相应按键)
                
                <b>源码</b>
                    <a href='https://github.com/ShenHongFei/Dict' target='_blank'>https://github.com/ShenHongFei/Dict</a>
            
        .main(
            v-if='item && item.type != "JP_GRAMMAR"' 
            v-html='render(item)'
            :class='item.type'
            tabindex='2'
            @click='jump($event)'
        )
        
        .main(
            v-if='item && item.type == "JP_GRAMMAR"' 
            :class='item.type'
            tabindex='2'
            @click='jump($event)'
        )
            h1.index {{item.index}}
            
            p
                span.level 【レベル】 {{item.level}}
            
            .content(v-for='(c, i) in item.contents')
                p.item_index(v-if='item.contents.length > 1') ({{i+1}})
                p.meaning(v-if='c.meaning') 【意味】　{{c.meaning}}
                p.situation(v-if='c.situation') 【場合】　{{c.situation}}
                p.continuation(v-if='c.continuation') 【継続】 {{c.continuation}}
                
                .sentences(v-if='c.sentences.length')
                    p 【例文】
                    p.sentence(v-for='s in c.sentences') {{s.replace('/', '　／　')}}
                    br
                
                .explainations(v-if='c.explainations && Object.keys(c.explainations).length')
                    p 【説明】
                    p.explaination_jp(
                        v-for='e in c.explainations.jp'
                        v-html='e\
                            .replace("◆", "<br>◆")\
                            .replace("×", "✘ ")\
                            .replace("→", "<br>→")\
                            .replace("○", "○ ")\
                            .replace(/◆([^✘])/, "◆ $1")\
                        '
                    )
                    br(v-if='c.explainations.jp')
                    p.explaination_cn(v-for='e in c.explainations.cn') {{e}}
                    br
                
                .notes(v-if='c.notes')
                    p 【注意】
                    p(v-html='c.notes.replace(/([①-⑩])/g, "<br>$1 ").replace(/^<br>/, "")')
                    br
                
                pre.confusion(v-if='c.confusion')
                    p 【分け方】
                    p {{c.confusion}}
                    br
            
            .synonyms(v-if='item.synonyms')
                p 【シソーラス】
                p(v-html='item.synonyms.join("<br>")')
                br
            
            .related_words(v-if='item.related_words && item.related_words.length')
                p 【関連語彙】
                p.related_word(v-for='word in item.related_words') {{word.index}}
                br
            
            
        
</template>


<script lang="coffee">
    cheerio  = require 'cheerio'
    
    module.exports = 
        data: ->
            index: ''
            
            items  : []
            item   : null
            
            input  : null
            side: null
            content: null
            cache  : {}
            
            focus: ''
            
            BORDER_NORMAL_COLOR: '#ccc'
            BORDER_ACTIVE_COLOR: '#666'
            
        
        methods:
            search: (index)->
                if !index
                    @item = null
                    return
                @index = index
                
                history.pushState(null, '', "##{index},0")
                if @cache[index]
                    @items = @cache[index]
                    @item  = @items[0]
                else
                    url = new URL '/Dict/search', location.href
                    url.search = new URLSearchParams {index}
                    
                    {@items} = await fetch_json url
                    
                    @items.forEach (x, i)->
                        # 加入 index
                        x.i = i
                    
                    @cache[@index] = @items
                    
                    @item = @items[0]
                    
                    log 'search:', index
                
                @side.focus()
            
            
            render: (item)->
                if item.type == 'EN_OALD'
                    $ = cheerio.load item.content
                    
                    $('img').attr 'src', (i, src)-> 
                        'data:image/' + src.split('.').pop() + ';base64,' + item.assets[src[1..-1]]
                    
                    # ---  去除英音
                    $('[resource="phon-gb"]').remove()
                    $('.phon-gb').remove()
                    $('[resource="uk_pron"]').remove()
                    
                    $('.chn').text (i,text)->
                        text.replace(/╱/g,'/').replace(/；/g,'、')
                    $('.tx').text (i,text)->
                        text.replace(/╱/g,'/').replace(/；/g,'、')
                    
                    # --- 单词语音
                    $('a[type="sound"]').each (i,e)->
                        $(e).replaceWith("""
                            <span id="audio-#{i}" onclick="Dict.play_spx('proncs/#{e.attribs.href.split('/').pop()}')" style="cursor:pointer">▶</span>
                        """)
                    @play()
                    
                    
                    if item.origin
                        $$ = cheerio.load(item.origin)
                        $$($$('object')?[1]).attr 'data', (i,link)-> "http://www.dicts.cn#{link}"
                        $.root().append($$.html())
                    
                    if item.word_root
                        item.word_root = item.word_root
                            .replace /来自.*?\*/g,  ''
                            .replace /PIE\*/g,      ''
                            .replace /[.。]/g,      '<br>'
                        $$ = cheerio.load(item.word_root)
                        $('.h').after "<div class='word-root'>" + $$.html() + "</div>"
                    
                    return $.html()
                
                if item.type == 'JP_JTS'
                    $ = cheerio.load item.content
                    return $($.root()).prepend("<h1 class='index'>" + item.index + "</h1>").html()
                    
            
            # ------------ 选择、点击跳转
            select_item: (item)->
                @item = item
                history.replaceState(null, '', "##{@index},#{@item.i}")
            
            select_item_i: (i)->
                @side.focus()
                if 0 <= i < @items.length
                    @select_item(@items[i])
                
            
            
            jump: (event)->
                m = event.target.href?.match '^entry://([^#]+)'
                if m?[1]
                    @search (@input.value = m[1])
            
            # --- 切换至 上一条目/下一条目
            next: -> 
                @side.focus()
                if @item?.i+1 < @items.length then @select_item(@items[@item.i+1]) 
                
            previous: ->
                @side.focus()
                if @item?.i-1 >= 0 then @select_item(@items[@item.i-1]) 
            
            
            
            # ------------ Speex 解码
            play_spx: (asset_key)->
                spx = @item.assets[asset_key]
                # 测试 spx base64 字符串位于 spx_test.txt 文件
                spx = atob(spx)
                [samples, header] = Speex.decodeFile(spx)
                Speex.util.play(samples, header.rate)
            
            play: (-> document.querySelector('#audio-0')?.click()).debounce 250
            
            
            
            clear: ->
                @input.value = ''
            
            
        mounted: ->
            window.Dict = @
            @input   = document.querySelector '.input'
            @side    = document.querySelector '.side'
            @main    = document.querySelector '.main'
            
            # ------------ 激活状态显示
            @input.onfocus= (event)=>
                @side.style.borderTopColor = @BORDER_ACTIVE_COLOR
                @main.style.borderTopColor = @BORDER_ACTIVE_COLOR
                @focus = @input
                
            
            @side.onfocus= (event)=>
                @side.style.borderTopColor = @BORDER_ACTIVE_COLOR
                @main.style.borderTopColor = @BORDER_NORMAL_COLOR
                @focus = @side
                
            @main.onfocus= (event)=>
                @side.style.borderTopColor = @BORDER_NORMAL_COLOR
                @main.style.borderTopColor = @BORDER_ACTIVE_COLOR
                @focus = @main
            
            
            # ------------ 快捷键
            document.onkeydown = (event)=>
                key    = event.key
                target = event.target
                
                ctrl = event.getModifierState('Control')
                alt  = event.getModifierState('Alt')
                
                if key == 'Escape'
                    event.preventDefault()
                    @input.value = ''
                    @input.focus()
                    return
                
                if key == 'Enter' && @focus == @side && @input.value
                    window.open 'http://www.google.com/search?q=' + @input.value, '_blank'
                    return
                
                if key == 'Enter' && target == @input
                    @search target.value
                    return
                
                if target == @input || ctrl || alt then return
                
                if key.match /^[1-9]$/
                    event.preventDefault()
                    @select_item_i(key-1)
                    return
                    
                if key == 's' || key == 'f'
                    event.preventDefault()
                    @input.value = ''
                    @input.focus()
                    return
                    
                if key == 'e'
                    event.preventDefault()
                    @input.focus()
                    return
                    
                
                if key == 'j'
                    event.preventDefault()
                    @main.focus()
                    @main.scrollTop += 80
                    return
                    
                if key == 'J'
                    event.preventDefault()
                    @main.focus()
                    @main.scrollTop = 1e5
                    return
                
                if key == 'k'
                    event.preventDefault()
                    @main.focus()
                    @main.scrollTop -= 80
                    return
                
                if key == 'K'
                    @main.focus()
                    @main.scrollTop = 0
                    return
                
                
                if key == 'h'
                    event.preventDefault()
                    history.go(-1)
                    return
                
                if key == 'l'
                    event.preventDefault()
                    history.go(1)
                    return
                
                
                if !event.shiftKey && key == 'Tab'
                    event.preventDefault()
                    @next()
                    return
                
                if event.shiftKey && key == 'Tab'
                    event.preventDefault()
                    @previous()
                    return
            
            
            
            # ------------ 后退，状态加载
            window.onhashchange = (event)=>
                log 'hashchange'
                [index, i] = event.newURL.split('#')[1]?.split ','
                if i == undefined || !@cache[@index = decodeURI(index)] then return
                @items = @cache[@index]
                @item = @items[i]
            
            
            
            
</script>


<style lang="stylus">
    side_width          = 300px
    side_width_small    = 200px
    head_height         = 40px
    main_width          = "calc(100vw - %s)" % side_width
    main_width_small    = "calc(100vw - %s)" % side_width_small
    main_height         = "calc(100vh - %s)" % head_height
    border_nomal_color  = #ccc
    border_active_color = #666
    search_button_width = 40px
    
    
    *
        box-sizing inherit
    
    body
        margin 0
        
    input
        border none
        background-image none
        background-color transparent
        box-shadow none
        &:focus
            outline none
        
    div:focus
        outline none
    
    .Dict
        font-family 'MyFont', 'Menlo', '华文细黑', '黑体'
        height 100%
        box-sizing border-box
        
        .head
            height head_height
            width 100%
            
            .input
                height head_height
                color #000
                width "calc(100% - %s)" % search_button_width
                font-size 1.6rem
                padding-left 20px
                
            .button
                position absolute
                right 0
                top 0
                height head_height
                width search_button_width
                cursor pointer
                background-image url('search.png')
                background-size 100% 100%
                border-left 2px solid border_nomal_color
                padding unset !important
                
        .side
            position absolute
            top head_height
            width side_width
            height main_height
            
            border-right 1px solid border_nomal_color
            border-top   2px solid border_nomal_color
            
            word-wrap break-word
            word-break keep-all
            
            padding-left 20px
            padding-right 20px
            
            overflow-y scroll
            
            &:focus
                border-top-color border_active_color
                
            
            h6.index 
                font-weight normal
                font-size 1rem
                padding-top 1rem
                margin-top unset
                margin-bottom unset
                cursor pointer
                .i
                    color:#757575
                
        .main
            position absolute
            left side_width
            top head_height
            width main_width
            height main_height
            
            padding-left 40px
            padding-right 40px
            padding-top 20px
            
            word-break keep-all
            word-wrap break-word
            
            border-top   2px solid border_nomal_color
            
            overflow-y scroll
            
            &:focus
                border-top-color border_active_color
            
            
            h2
                margin-block-start 0
        
        @media(max-width: 700px)
            .side
                width 100vw
                height 118px
                
                h6.index
                    padding-top 0.5rem
                
            .main
                width 100vw
                left 0
                top 158px
            
            
        @media (min-width: 700px) and (max-width: 1200px)
            .side
                width side_width_small
            .main
                left side_width_small
                width main_width_small
        
        // ------------ JP_GRAMMAR
        .main.JP_GRAMMAR
            .index
                line-height 4rem
                font-size 4rem
                font-weight normal
                margin-top 0
                margin-bottom 15px
            
            .item_index
                font-size 2rem
            
            .related_word
                line-height 0.8rem
        
        // ------------ JP_JTS 講談社日中辞典
        .main.JP_JTS
            line-height 1.5rem
            padding-top 15px
            .index
                line-height 4rem
                font-size 4rem
                font-weight normal
                margin-top 0
                margin-bottom 15px
            // 
            .exp
                margin-top 0
                margin-bottom 0
                font-weight bold
                color #0063b4
                line-height 2rem
            .egs
                margin-bottom 1rem
        
        
        // ------------ EN_OALD 牛津高阶英汉双解词典
        .main.EN_OALD
            .word-root
                margin-bottom 1rem
                font-weight bold
            .Media
                cursor pointer
            .d .chn
                font-weight bold
            .gl
                &:after
                    content ' '
            a
                text-decoration none
            .top-g .z
                display none
            .pos
                display block
                color #d11000
                margin-top 1rem
                font-weight bold
                font-size 1.2rem
            .fayin
                display inline
            .sd
                display block
                font-weight bold
                margin-top 1rem
            .cf
                color #0070C0
                .swung-dash
                    margin-right .4em
            .cf[display="block"]
                display block
            .pv, .id
                display block
                color #0070C0
                font-weight bold
            .tx
                &:before
                    content '　'
            img
                border 0
                max-width 700px
                &.fayin
                    width 15px
                    height 15px
                &.img
                    width 1em
                    height 1em
                    margin-left -4px
                    margin-bottom -2px
                &.Media
                    clear both
            .h-g
                .top-g
                    .h
                        font-size 4rem
                        display block
            .id-g
                display inline
            .revout + .id-g, .z + .pv-g
                display block
            .revout
                font-weight bold
                margin-top 1rem
                display block
                &:before
                    content "【"
                &:after
                    content "】"
            span.arbd1, span.dhb, span.fm, span.unei, .ndv, .cl, .ei, .ndv
                padding-right 0.2em
            span.unsyn, span.unfm, .eb
                padding-right 0.2em
                text-transform uppercase
                font-size smaller
                color #C76E06
            .ungi, .gi, .g
                color green
                font-style italic
            .label-g
                color green
                .chn
                    display inline
                    &:before
                        content ""
            .dr-g
                display block
            .phon-gb, .phon-us
                color red
            .z_phon-us
                display none
            .alt[q="also"]
                display block
            .n-g
                display block
                margin-bottom 2rem
            .x-g
                display block
                margin-left 2em
            .n-g .xr-g
                margin-left 2em
            .xr-g
                display block
            .z_ei-g
                display none
            .sense-g
                display block
            .block-g
                display block
            .ids-g, .pvs-g
                display block
            .infl
                display block
            .para
                display block
            .wordbox
                display block
                margin-left 18px
                margin-right 18px
                padding 5px 16px
                border-radius 10px
                border-color #C76E06
                border-style ridge
                clear both
            .word
                display table-cell
                background-color #C76E06
                color #FAFAFA
                text-transform uppercase
            .wfw
                display inline
            .unbox
                display block
                padding-left 2px
            .tab
                display table-cell
                background-color #C76E06
                color #FAFAFA
                text-transform uppercase
                text-align left
            .title
                display block
                text-transform uppercase
                font-size small
            .table
                display table
                margin 12px 0 8px 0
            .tr
                display table-row
            .td
                display table-cell
                margin-right 10px
            .th
                display table-cell
                color #C76E06
                text-transform uppercase
            .althead
                text-transform uppercase
            .patterns
                display block
                clear both
                .althead
                    display table-cell
                    margin 0px auto 0px auto
                    text-transform uppercase
                .para
                    -ms-word-break break-all
                    word-break break-word
                    -webkit-hyphens auto
                    -moz-hyphens auto
                    hyphens auto
            .help
                display block
            .symbols-coresym
                color green
                display inline-block
            .symbols-small_coresym
                color green
                display inline-block
                font-size 70%
                top -.1em
                margin-right .15em
            .symbols-xsym
                display none
            .symbols-xrsym
                font-style normal
                color #555555
                margin-right .25em
            .symbols-helpsym, .symbols-synsym, .symbols-awlsym, .symbols-oppsym, .symbols-etymsym, .symbols-notesym
                color rgb(255, 255, 255)
                background rgb(183, 128, 50)
                font-size 65%
                padding 1px 3px 2px
                display inline-block
                margin 0 .4em 0 0
                text-transform uppercase
                top -1px
                line-height 1em
                border-radius 1px
            .symbols-oppsym
                background darkred
            .symbols-drsym
                font-size 70%
                color rgb(0, 0, 0)
            .symbols-para_square
                color rgb(80, 80, 80)
                font-size 65%
            .symbols-synsep
                color rgb(80, 80, 80)
                font-size 65%
            span#wx
                text-decoration line-through
            span#unwx
                text-decoration line-through
            swung-dash
                visibility hidden
                &::after
                    visibility visible
                    content "\007E \0020"
            .pv-g
                .swung-dash
                    visibility hidden
                    &::after
                        visibility visible
                        content "\007E \0020"
            .z_n
                display none
            .symbols-small_coresym
                display none
            .z_ab
                color green
            .gr, .subject
                color green
            .dr
                color blue
        
            #cigencizui-content
                .word
                    display unset
                    background-color unset
                    color unset
                    text-transform unset
</style>
