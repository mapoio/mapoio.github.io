<!DOCTYPE html>
<html lang="{{ config.language }}">
{% include '_partials/head.swig' %}
<body class="{{ body_class }}">
	<div class="site-wrapper">
		{% block content %} {% endblock %}
	</div>
	{% if is_post() %}
		{% include "_partials/widget.swig" %}
	{% endif %}
	{% include '_partials/footer.swig' %}
	{% include "_partials/javascript.swig" %}
</body>
</html>
