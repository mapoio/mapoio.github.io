{# service workers #}
{% if theme.service_workers %}
<script>
    "serviceWorker"in navigator&&window.addEventListener("load",function(){
        navigator.serviceWorker.register("/sw.js")
            .then(function(e){
                console.log("ServiceWorker registration successful with scope: ",e.scope)
            })
            .catch(function(e){
                console.log("ServiceWorker registration failed: ",e)
            })
    });
</script>
{% else %}
{# 卸载时为 unregister #}
<script>
    if(window.navigator && navigator.serviceWorker) {
        navigator.serviceWorker.getRegistrations().then(function(registrations) {
            for(let registration of registrations) {
                registration.unregister()
            }
        })
    }
</script>
{% endif %}

{% if is_post() && theme.floadheader %}
{% include "public/fload-header.swig" %}
{% endif %}

<script id="scriptLoad" src="{{ cdn_img('/js/allinone.min.js') }}" async></script>

{# 脚本加载监听 #}
<script>
    document.getElementById('scriptLoad').addEventListener('load', function () {
        {# 图片懒加载 #}
        {% if !is_post() || (is_post() && theme.lazyload) %}
            var bLazy = new Blazy();
        {% endif %}

        {# 文章页浮动顶栏 #}
        {% if is_post() && theme.floadheader %}
            postProgressBar();
        {% endif %}

        {# 本地搜索 #}
        {% if theme.local_search %}
        {% if theme.service_workers %}
            searchFuncSW("{{ config.root }}");
        {% else %}
            searchFunc("{{ config.root }}");
        {% endif %}
        {% endif %}
    });

    (function (window, document) {
        // set up Casper as a global object
        if (!window.Casper) {
            window.Casper = {};
        }

        window.Casper.stickyNavTitle = function stickyNavTitle(options) {
            var nav = document.querySelector(options.navSelector);
            var title = document.querySelector(options.titleSelector);

            var lastScrollY = window.scrollY;
            var ticking = false;

            function onScroll() {
                lastScrollY = window.scrollY;
                requestTick();
            }

            function requestTick() {
                if (!ticking) {
                    requestAnimationFrame(update);
                }
                ticking = true;
            }

            function update() {
                var trigger = title.getBoundingClientRect().top + window.scrollY;
                var triggerOffset = title.offsetHeight + 35;

                // show/hide post title
                if (lastScrollY >= trigger + triggerOffset) {
                    nav.classList.add(options.activeClass);
                } else {
                    nav.classList.remove(options.activeClass);
                }

                ticking = false;
            }

            window.addEventListener('scroll', onScroll, {passive: true});

            update();
        };
    })(window, document);
    
    {% if is_post() %}
        Casper.stickyNavTitle({
            navSelector: '.post-site-header',
            titleSelector: '.post-full-title',
            activeClass: 'nav-post-title-active'
        });
    {% endif %}

</script>

{# 相册 #}
{% if (is_post() || is_page()) and theme.photoswipe %}
{{ cdn_css('photoswipe/photoswipe') }}
{{ cdn_css('photoswipe/default-skin/default-skin') }}
{{ cdn_js('photoswipe/photoswipe.min') }}
{{ cdn_js('photoswipe/photoswipe-ui-default.min.js') }}
{% endif %}

{% if theme.mermaid.enable && is_post() && page.mermaid %}
<script id="mermaidScript" src="{{ theme.mermaid.url }}" async></script>
<script>
    document.getElementById('mermaidScript').addEventListener('load',function(){
        if (window.mermaid) {
            mermaid.initialize({{ JSON.stringify(theme.mermaid.options) }});
        }
    });
</script>
{% endif %}


{# Valine 评论 #}
{% if is_post() and theme.comment %}
<script id="valineScript" src='//unpkg.com/valine/dist/Valine.min.js' async></script>
<script>
    document.getElementById('valineScript').addEventListener("load", function() {
        new Valine({
            el: '#comment' ,
            verify: {{ theme.valine.verify }},
            notify: {{ theme.valine.notify }},
            appId: '{{ theme.valine.appId }}',
            appKey: '{{ theme.valine.appKey }}',
            placeholder: '{{ theme.valine.placeholder }}',
            pageSize: {{ theme.valine.pageSize }},
            avatar: '{{ theme.valine.avatar }}',
            visitor: {{ theme.valine.visitor }}
        })
    });
</script>
{% endif %}

{% if is_post() and theme.gitalk.active %}
<script id="gitalkScript" src="https://cdn.jsdelivr.net/gh/gitalk/gitalk/dist/gitalk.min.js" async></script>
<script>
    document.getElementById('gitalkScript').addEventListener("load", function() {
        var gitalk = new Gitalk({
            clientID: '{{ theme.gitalk.clientID }}',
            clientSecret: '{{ theme.gitalk.clientSecret }}',
            repo: '{{ theme.gitalk.repo }}',      // The repository of store comments,
            owner: '{{ theme.gitalk.owner }}',
            admin: '{{ theme.gitalk.admin }}'.split(',').map(function (i) { return i.trim() }),
            id: location.pathname,      // Ensure uniqueness and length less than 50
            distractionFreeMode: {{ theme.gitalk.distractionFreeMode }}  // Facebook-like distraction free mode
        });
        gitalk.render('gitalk-container')
    });
</script>
{% endif %}

{# 百度 SEO #}
{% if theme.baidu %}
<script>
    document.addEventListener('DOMContentLoaded',function(){
        var bp = document.createElement('script');
        var curProtocol = window.location.protocol.split(':')[0];
        if (curProtocol === 'https') {
            bp.src = 'https://zz.bdstatic.com/linksubmit/push.js';
        }
        else {
            bp.src = 'http://push.zhanzhang.baidu.com/push.js';
        }
        var s = document.getElementsByTagName("script")[0];
        s.parentNode.insertBefore(bp, s);
    });
</script>
{% endif %}

<% if (page.math) { %>
<script type="text/x-mathjax-config">
   MathJax.Hub.Config({"HTML-CSS": { preferredFont: "TeX", availableFonts: ["STIX","TeX"], linebreaks: { automatic:true }, EqnChunk: (MathJax.Hub.Browser.isMobile ? 10 : 50) },
        tex2jax: { inlineMath: [ ["$", "$"], ["\\(","\\)"] ], processEscapes: true, ignoreClass: "tex2jax_ignore|dno",skipTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code']},
        TeX: {  noUndefined: { attributes: { mathcolor: "red", mathbackground: "#FFEEEE", mathsize: "90%" } }, Macros: { href: "{}" } },
        messageStyle: "none"
    }); 
</script>
<script type="text/x-mathjax-config">
    MathJax.Hub.Queue(function() {
        var all = MathJax.Hub.getAllJax(), i;
        for(i=0; i < all.length; i += 1) {
            all[i].SourceElement().parentNode.className += ' has-jax';
        }
    });
</script>
<script type="text/javascript" src="https://cdn.jsdelivr.net/npm/mathjax@3.2.0/es5/tex-mml-svg.js"></script>
<% } %>