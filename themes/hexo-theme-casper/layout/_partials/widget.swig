{# 插件容器, 在需要的页面引入 #}

{% if theme.widgets %}
{% if site.posts.length %}
<aside class="read-next outer">
    <div class="inner">
        <div class="read-next-feed">

            <article class="read-next-card">
                <header class="read-next-card-header">
                    <h3><span>最新文章</span></h3>
                </header>
                <div class="read-next-card-content">
                    <ul>
                        {% set recent = site.posts.sort('date', -1) %}
                        {% for post in recent %}
                        {% if loop.key < 3 %}
                        <li>
                            <h4><a href="{{ url_for(post.path) }}">{{ post.title }}</a></h4>
                            <div class="read-next-card-meta">
                                <p><time datetime="{{ date(post.date, 'YYYY-MM-DD') }}">{{ date(post.date, 'D MMM YYYY') }}</time> –
                                    {{ Math.round(strip_html(post.content).length/500) }}min read</p>
                            </div>
                        </li>
                        {% endif %}
                        {% endfor %}
                    </ul>
                </div>
                <footer class="read-next-card-footer">
                    <a href="{{ url_for('/archives') }}">
                          MORE  → 
                    </a>
                </footer>
            </article>

            {% if page.prev %}
            <article class="post-card post {% if not page.prev.cover_img %} no-image {% endif %}">
				{% if page.prev.cover_img %}
				<a class="post-card-image-link" title="{{ page.prev.title }}" href="{{ url_for(page.prev.path) }}">
					<div class="post-card-image b-lazy" data-src="{{ cdn_img(page.prev.cover_img) }}"></div>
				</a>
				{% endif %}
				<div class="post-card-content">
					<a class="post-card-content-link" title="{{ page.prev.title }}" href="{{ url_for(page.prev.path) }}">
						<header class="post-card-header">
							<span class="post-card-tags">
								{% if page.prev.categories %}
								{% for cate in page.prev.categories %}
								{{ cate.name }}
								{% endfor %}
								{% endif %}
							</span>
							<h2 class="post-card-title">{{ page.prev.title }}</h2>
						</header>
						<div class="post-card-excerpt">
							<p>
								{% set num = 100 %}
								{% if not page.prev.cover_img %}
								{% set num = 240 %}
								{% endif %}
								{% if loop.first %}
								{% set num = 80 %}
								{% endif %}
								{% set content = page.prev.content | striptags %}
								{% if page.prev.summary %}
								{% set content = page.prev.summary %}
								{% endif %}
								{{ content.substring(0, num) }}
								{% if content.length > num %}...{% endif %}
							</p>
						</div>
					</a>
					<footer class="post-card-meta">
						<div class="author-list">
							<div class="author-list-item">
								<div class="author-name-tooltip">{{ config.author }}</div>
								{% if theme.author_image %}
								<a href="/about" class="static-avatar">
									<img class="author-profile-image" src="{{ theme.author_image }}" alt="{{ config.author }}" />
								</a>
								{% else %}
								<a href="/about" class="static-avatar author-profile-image">
									{% include "public/icons/avatar.svg" %}
								</a>
								{% endif %}
							</div>
						</div>
						<span class="reading-time">
							{{ Math.round(strip_html(page.prev.content).length/500) }}
							min read
						</span>
					</footer>
				</div>
			</article>
            {% endif %}
            {% if page.next %}
            <article class="post-card post {% if not page.next.cover_img %} no-image {% endif %}">
				{% if page.next.cover_img %}
				<a class="post-card-image-link" title="{{ page.next.title }}" href="{{ url_for(page.next.path) }}">
					<div class="post-card-image b-lazy" data-src="{{ cdn_img(page.next.cover_img) }}"></div>
				</a>
				{% endif %}
				<div class="post-card-content">
					<a class="post-card-content-link" title="{{ page.next.title }}" href="{{ url_for(page.next.path) }}">
						<header class="post-card-header">
							<span class="post-card-tags">
								{% if page.next.categories %}
								{% for cate in page.next.categories %}
								{{ cate.name }}
								{% endfor %}
								{% endif %}
							</span>
							<h2 class="post-card-title">{{ page.next.title }}</h2>
						</header>
						<div class="post-card-excerpt">
							<p>
								{% set num = 100 %}
								{% if not page.next.cover_img %}
								{% set num = 240 %}
								{% endif %}
								{% if loop.first %}
								{% set num = 80 %}
								{% endif %}
								{% set content = page.next.content | striptags %}
								{% if page.next.summary %}
								{% set content = page.next.summary %}
								{% endif %}
								{{ content.substring(0, num) }}
								{% if content.length > num %}...{% endif %}
							</p>
						</div>
					</a>
					<footer class="post-card-meta">
						<div class="author-list">
							<div class="author-list-item">
								<div class="author-name-tooltip">{{ config.author }}</div>
								{% if theme.author_image %}
								<a href="/about" class="static-avatar">
									<img class="author-profile-image" src="{{ theme.author_image }}" alt="{{ config.author }}" />
								</a>
								{% else %}
								<a href="/about" class="static-avatar author-profile-image">
									{% include "public/icons/avatar.svg" %}
								</a>
								{% endif %}
							</div>
						</div>
						<span class="reading-time">
							{{ Math.round(strip_html(page.next.content).length/500) }}
							min read
						</span>
					</footer>
				</div>
			</article>
            {% endif %}
        </div>
    </div>
</aside>
{% endif %}
{% endif %}