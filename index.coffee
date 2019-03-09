require 'lib.browser.coffee'
require 'lib/ScrollBar.styl'
require('sugar').extend()

using window, ->
    @__webpack_public_path__ = 'http://' + location.host
    
    @Vue = require('vue').default
    
    @Dict = require('./index.vue').default
    
    @root = new Vue
        el        : '#root'
        template  : '<dict ref="dict"/>'
        components: {@Dict}
        mounted   : ->
            log 'dict mounted:', @dict = @$refs.dict
        
