using (global.Dict = {}), ->
    @FILE= ROOT + 'Dict/Dict.coffee'
    
    @db= DB.get 'dict'
    
    @en        = @db.collection 'en'
    @en_proncs = @db.collection 'en_proncs'
    @jp        = @db.collection 'jp'
    
    @grammars           = require ROOT + 'data/grammars.json'
    @grammar_categories = require ROOT + 'data/grammar_categories.coffee'
    
    @assets_cache= {}
    
    @reload= ->
        clear @
        require @FILE
    
    @hot= -> File.Watcher.run_on @
    @cool= -> @watcher.stop()
    
    
    @search_db= (collection, regex_pattern, is_start_with=true)->
        await collection.find
                index:
                    $regex  : (if is_start_with then '^' else '') + regex_pattern
                    $options: 'i'
            ,
                limit: 100
                batch_size: 100
            .toArray()
    
    
    @search_grammars= (index)->
        items = []
        
        # --- 按 level 学习
        if index.match /^N[1-5]$/
            for id, g of @grammars
                if g.level == index
                    g.type = 'JP_GRAMMAR'
                    items.push g
            return items
        
        # --- 按分类学习
        if @grammar_categories.has index
            for id, g of @grammars
                for s in g.contents.map 'situation'
                    if s == index
                        g.type = 'JP_GRAMMAR'
                        items.push g
                        break
            return items
        
        # --- 查询语法
        re = new RegExp index
        for id, g of @grammars
            if re.test g.index
                g.type = 'JP_GRAMMAR'
                items.push g
        items[...60]
    
    
    @search= (index='', {is_load_assets=true}={})->
        index = index.trim()
        
        # ------------ 查询英语单词，搜索 《OALD 牛津高阶英汉双解词典》（第8版）
        if index.match(/^[\x00-\x7F]*$/) && !index.match(/^N[1-5]$/)
            items = await @search_db(@en, index)
            
            if !is_load_assets then return items
            
            for item in items   # 处理 item，修改属性及添加 asset
                item.type = 'EN_OALD'
                delete item._id
                
                item.assets = assets = {}   # 根据链接获取图片资源
                for line in item.content.split '\n'
                    if !(m = line.match ///.*src="/(symbols|pic|thumb)/(.+?)\.(.+?)"///) then continue
                    asset_key = m[1] + '/' + m[2] + '.' + m[3]
                    if asset_key in assets       then continue
                    if asset_key in @assets_cache then assets = @assets_cache[asset_key]; continue
                    try
                        buf = fs.readFileSync 'Dict/OALD/' + asset_key
                        @assets_cache[asset_key] = assets[asset_key] = buf.toString('base64')
                    catch err
                        if err.code == 'ENOENT' then console.log 'ENOENT:', index, asset_key; continue
                        throw err
                
                for pronc in item.proncs # 加载发音（美音），加入 assets
                    pronc_doc = await @en_proncs.findOne index: pronc
                    assets[ 'proncs/' + pronc + '.spx' ] = pronc_doc.spx.buffer.toString 'base64'  # new Buffer pronc_doc.spx.value() 是错误的方法
        
        else # ------------ 查询日语语法或单词
            # --- 语法
            items = @search_grammars(index)
            
            # --- 講談社日中辞典 JTS
            
            items_ = await @search_db(@jp, index)
            
            if !items_.length
                items_ = await @search_db(@jp, index, is_start_with=false)
            
            for item, i in items_
                
                first_line = item.content.split('\n')[0]
                if first_line.startsWith('@@@LINK=')
                    real_index = first_line.replace '@@@LINK=', ''
                    item       = await @jp.findOne index: real_index  
                
                item.type = 'JP_JTS'
                delete item._id
                items_[i] = item     # save item (ugly hack !!)
            
            items = [items..., items_...]
        
        {items}
    


log 'Dict'.pad(20) + '加载完成'



repl= ->
    use Dict
    
    Dict.search_grammars 'あれ'
    
    log inspect (await Dict.search 'ところ'), depth:4
    
    
    