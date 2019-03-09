using (global.Dict = {}), ->
    @FILE= ROOT + 'Dict/Dict.coffee'
    
    @db= DB.get 'dict'
    
    @en        = @db.collection 'en'
    @en_proncs = @db.collection 'en_proncs'
    @jp        = @db.collection 'jp'
    
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
    
    @search= ({index='', is_load_assets=true}={})->
        index = index.trim()
        if index.match /^[\x00-\x7F]*$/   # OALD 牛津高阶英汉双解词典（第8版）
            items = await @search_db(@en, index)
            if !is_load_assets then return items
            for item in items   # 处理 item，修改属性及添加 asset
                delete item._id
                item.type = 'EN_OALD'
                
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
            
        else  # 講談社日中辞典 JTS
            items = await @search_db(@jp, index)
            if !items.length then items = await @search_db(@jp, index, is_start_with=false)
            for item, i in items
                first_line = item.content.split('\n')[0]
                if first_line.startsWith('@@@LINK=')
                    real_index = first_line.replace '@@@LINK=', ''
                    item       = await @jp.findOne index: real_index  
                
                delete item._id
                item.type = 'JP_JTS'
                items[i] = item     # save item (ugly hack !!)
        
        
        error: null
        data : items
    


log 'Dict'.pad(20) + '加载完成'



    