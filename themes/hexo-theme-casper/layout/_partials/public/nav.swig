{# NAV 导航部分, 遍历主题配置文件中的 menu 生成 link #}
<nav class="site-nav"> 
    <div class="site-nav-left">
        {% if theme.blog_logo and is_post() %}
        <a class="site-nav-logo" href="{{ config.root }}"  title="{{ config.title }}">
            <img src="{{ cdn_img(theme.blog_logo) }}" alt="{{ config.title }}" />
        </a>
        {% endif %}
        <div class="site-nav-content">
        <ul class="nav">
            <li>
                <a href="{{ config.root }}" title="Home">HOME</a>
            </li>
            {% if theme.menu %}
            {% for menu,link in theme.menu %}
            <li>
                <a href="{{ link }}" title="{{ menu }}">{{ menu }}</a>
            </li>
            {% endfor %}
            {% endif %}
        </ul>
        {% if is_post() %}
            <span class="nav-post-title">{{ page.title }}</span>
        {% endif %}
        </div>
    </div>
    {% if theme.local_search %}
    <div class="search-button-area">
        <a href="#search" class="search-button">Search ...</a>
    </div>
    {% endif %} 
    <div class="site-nav-right">
        {% if theme.local_search %}
        <a href="#search" class="search-button">Search ...</a>
        {% endif %} 
        {% include 'social.swig' %}
    </div>
</nav>