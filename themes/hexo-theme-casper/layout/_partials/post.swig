{# 文章页 #}
{% macro tpl() %}
<div id="site-main" class="site-main outer" role="main">
    <div class="inner">
        <header class="post-full-header">
            <div class="post-full-meta">
                {% if page.categories %}
                {% for cate in page.categories %}
                <a href="{{ url_for(cate.path) }}">{{ cate.name }}</a>&nbsp;&nbsp;
                {% endfor %}
                {% endif %}
            </div>
            <h1 class="post-full-title">{{ page.title }}</h1>
            {% if page.description %}
            <p class="post-full-custom-excerpt">{{ page.description }}</p>
            {% endif %}
        </header>

        {% if page.cover_img %}
        <figure class="post-title-image">
            <img
                srcset="{{ cdn_img(page.cover_img) }} 300w,
                        {{ cdn_img(page.cover_img) }} 600w,
                        {{ cdn_img(page.cover_img) }} 1000w,
                        {{ cdn_img(page.cover_img) }} 2000w"
                sizes="(max-width: 800px) 400px,
                    (max-width: 1170px) 1170px,
                        2000px"
                src="{{ cdn_img(page.cover_img) }}"
                alt="{{ page.title }}"
            />
        </figure>
        {% endif %}
        <div class="post-full {% if not page.feature_img %}no-image{% endif %}">
            {% if page.feature_img %}
            <figure class="post-full-image" style="background-image: url({{ page.feature_img }})">
            </figure>
            {% endif %}
            <div class="post-full-content">
                <article id="photoswipe" class="post-markdown-body">
                    {{ page.content }}
                </article>
                <ul class="tags-postTags">
                    {% for tag in page.tags %}
                    <li>
                        <a href="{{ url_for(tag.path) }}" rel="tag"># {{ tag.name }}</a>
                    </li>
                    {% endfor %}
                </ul>
            </div>
        </div>
    </div>

    {% if theme.gitalk.active %}
    <div class="inner">
        <div id="gitalk-container"></div>
    </div>
    {% endif %}
</div>
{% if theme.post_toc %}
{% include "public/toc.swig" %}
{% endif %}

{% if theme.photoswipe %}
{% include "public/photoswipe.swig" %}
{% endif %}

{% endmacro %}