---
layout:     post
title:      "同时部署Jekyll到Github和Coding的Pages服务上"
subtitle:   "同时部署多个节点，加速国内访问"
date:       2019-04-05 16:25:00
author:     "Mapo"
header-img: "img/blue.png"
catalog: true
tags:
  - Jekyll
  - Pages
  - Coding
  - Github
  - Gitalk
  - TravisCI
  - 记录
---

> 记录了我的博客部署过程，非常感谢[Github](https://github.com)、[Coding](https://coding.net)提供的Pages服务，[Gitalk](https://github.com/gitalk/gitalk)提供的开源评论方案，[Jekyll](https://jekyllrb.com/)提供的博客方案。  

## 准备工作  
在部署Jekyll之前需要准备一些小东西。  
* 一个Github账号  
* 一个Coding或者Gitee账号  
* 一个简单好记的域名（实话，io域名还是有点贵的，top域名最便宜。主要是我抢到了四位字母的域名实在是不舍得放弃）  
* 阿里云或者腾讯云账号  
* 会使用Google或者Baidu解决问题  

最后一点很重要，如果不会搜索的话，建议直接直接使用博客园发布文章。不要来折腾这个玩意，会后悔的。  

## 配置Jekyll  
> 官方Jekyll文档直达：[英文原版文档](https://jekyllrb.com/docs/)、[中文文档](https://jekyllcn.com/docs/home/)  

> 以下是我的博客部署过程，非常简单。本博客的主题是出自[Hux](http://huangxuan.me/)的博客  

> 如果你不想去重新配置一个博客，可以直接克隆我的[博客](https://github.com/mapoio/mapoio.github.io)，然后直接跳转到[修改_config.yml配置文件](#config)

### 克隆一个博客仓库  
可以选择任意一个博客仓库去克隆，然后就可以直接开始写自己的内容了，但是为了后面同时部署方便快捷，我们需要做一点操作。  
1. 从Github中下载一个Jekyll博客，例如[Hux](https://github.com/Huxpro/huxpro.github.io/archive/master.zip)的博客，点击链接直接下载
2. 解压`master.zip`到`blog`文件夹
3. 在Github中新建一个`你的用户名.github.io`的仓库，此处我的仓库名称为`mapoio.github.io`
4. 运行如下命令完成git仓库初始化  

```bash
git init
git remote add origin git@github.com:mapoio/mapoio.github.io.git
git add .
git commit -m "初始化博客"
git push -u origin source
```

> 注意： 推送分支直接推送到了远程的`source`分支上，不是`master`。`master`分支将用来部署Pages服务，`source`将会是我们的写作分支。

<div id="config"></div>
### 修改_config.yml配置文件  
_config.yml中包含了网站的所有配置文件，里面包含了注释内容，修改有些注意事项。
1. 务必修改`Site settings`设置，这将关系到生成的静态文件，作者
2. 评论可以使用Disqus、Gitalk、Netease，推荐使用Gitalk，无需备案即可开启评论
3. 修改`Sidebar settings`个人展示信息

推荐设置资料：  
* [Gitalk设置指南](https://github.com/gitalk/gitalk)
* [Hux](https://github.com/Huxpro/huxpro.github.io)

## 部署Jekyll到多个服务  
> 部署方面配置稍微复杂一点  

### 部署到Github Pages  
如果使用Github的默认功能直接去生成Pages，不太好操作，无法直接部署到多个服务节点。所以这里使用TravisCI去部署页面，实现更灵活的方式部署。  
这里直接贴出重要脚本  
```yml
# .travis.yml ci配置脚本
language: ruby
rvm:
  - 2.3.3
# 设置只监听哪个分支
branches:
  only:
    - source
# 缓存，可以节省集成的时间
cache:
  apt: true
  gem: true
  directories:
    - node_modules
before_install:
  - git config --global user.name "mapoio"
  - git config --global user.email "one@mapo.io"
  - export TZ='Asia/Shanghai'
  - chmod +x _travis.sh
install:
  - gem install jekyll
  - gem install jekyll-paginate
script:
  - jekyll build
after_success:
  - ./_travis.sh

env:
 global:
   # 修改为自己Github用户名
   - GH_USER_NAME: mapoio
   # 修改为自己Github仓库地址
   - GH_REF: github.com/mapoio/mapoio.github.io.git
```

部署脚本`_travis.sh`  
```shell
#!/bin/bash

#定义时间
time=`date +%Y-%m-%d\ %H:%M:%S`

#执行成功
function success(){
   echo "success"
}

#执行失败
function failure(){
   echo "failure"
}

#默认执行
function default(){

  cd ./_site

cat <<EOF >> README.md
| 部署状态 | 集成结果                               | 参考值                              |
| -------- | -------------------------------------- | ----------------------------------- |
| 完成时间 | $time                                  | yyyy-mm-dd hh:mm:ss                 |
| 部署环境 | $TRAVIS_OS_NAME + $TRAVIS_NODE_VERSION | window \| linux + stable            |
| 部署类型 | $TRAVIS_EVENT_TYPE                     | push \| pull_request \| api \| cron |
| 启用Sudo | $TRAVIS_SUDO                           | false \| true                       |
| 仓库地址 | $TRAVIS_REPO_SLUG                      | owner_name/repo_name                |
| 提交分支 | $TRAVIS_COMMIT                         | hash 16位                           |
| 提交信息 | $TRAVIS_COMMIT_MESSAGE                 |
| Job ID   | $TRAVIS_JOB_ID                         |
| Job NUM  | $TRAVIS_JOB_NUMBER                     |
EOF

  git init
  git add --all .
  git commit -m "Update Blog By TravisCI With Build $TRAVIS_BUILD_NUMBER"
  # Github Pages
  git push --force --quiet "https://${REPO_TOKEN}@${GH_REF}" master:master

}

case $1 in
    "success")
	     success
       ;;
    "failure")
	     failure
	     ;;
	         *)
       default
esac
```

其中我们需要在TravisCI中设置一个环境变量`REPO_TOKEN`
* `REPO_TOKEN`指的是Github下创建的具有仓库写权限的`Token`，点击[此处链接](https://github.com/settings/tokens/new)快速创建`Token`

![创建Github-Token](/img/post/20190405/setGithubToken.png)

![设置CI环境变量](/img/post/20190405/setCIENV.png)

然后去Github仓库设置中，选择master分支部署，部署成功后应该是能访问地址`你的用户名.github.io`，此处我的访问地址为`mapoio.github.io`  
> 注意：如果没有maste分支，请先检查TravisCI是否成功执行，成功执行后应该是会直接推送静态页面到master分支。

![设置域名访问](/img/post/20190405/github-pages.png)

### 部署到Coding Pages  
部署到Coding上的教程也比较简单  
1. 在Coding上创建一个`你的用户名`的仓库，此处我的仓库名为`sport`，不要添加任何东西，直接下一步
2. 创建一个具有仓库写权限的`访问令牌`，点击[此处链接](https://coding.net/user/account/setting/tokens/new)直接创建![创建Coding-Token](/img/post/20190405/coding-token.png)
3. 修改部署脚本，添加如下内容

```yml
# .travis.yml
...
env:
 global:
   # 修改为自己Github用户名
   - GH_USER_NAME: mapoio
   # 修改为自己Github仓库地址
   - GH_REF: github.com/mapoio/mapoio.github.io.git
   # 修改为自己Coding用户名
   - CODING_USER_NAME: sport
   # 修改为自己Coding仓库地址
   - CODING_REF: git.coding.net/sport/sport.git
```

```shell
# _travis.sh
...
  git init
  git add --all .
  git commit -m "Update Blog By TravisCI With Build $TRAVIS_BUILD_NUMBER"
  # Github Pages
  git push --force --quiet "https://${REPO_TOKEN}@${GH_REF}" master:master
  # Coding Pages
  git push --force --quiet "https://${CODING_USER_NAME}:${CODE_TOKEN}@${CODING_REF}" master:master

}

case $1 in
    "success")
	     success
       ;;
    "failure")
	     failure
	     ;;
	         *)
       default
esac
...
```

此处新添加了一个环境变量`CODE_TOKEN`，直接将我们创建的Coding的授权令牌新增到TravisCI中就好了  

![设置CI环境变量](/img/post/20190405/setCIENV.png)

* 开启Coding的Pages服务

> 注意：一定要运行一次成功的CI任务后，才能开启Pages服务，如果无法运行Pages服务或者是没有成功把编译后的静态文件推送到Coding的master分支上，则需要检查CI配置和运行情况。

![开启Coding的Pages](/img/post/20190405/coding-pages.png)

### DNS分流
> DNS分流的作用主要是，在国内国外不同地区访问可以解析不同的CNAME地址，这样就实现了国内访问使用Coding的服务，国外访问就是用Github的服务

此处使用阿里云解析作为例子，直接使用智能解析即可，创建两条CNAME解析记录

| 记录类型 | 解析线路 | 记录值           |
| -------- | -------- | ---------------- |
| CNAME    | 默认     | sport.coding.me  |
| CNAME    | 国外     | mapoio.github.io |

![设置阿里云CNAME解析](/img/post/20190405/cname.png)

然后分别在他们的Pages服务中添加域名解析即可  
添加域名后还需要修改在Github上的`source`分支上的`CNAME`文件，里面直接写入你解析好的域名地址，此处我的地址为`mapo.io`。

### HTTPS设置  
> 如果要开启HTTPS的话会有点麻烦，这里介绍一下，如何同时开启HTTPS访问  
> 重要：下面的步骤顺序很关键，打乱顺序将可能导致无法开启HTTPS访问

1. 前往阿里云解析**暂停**国外路线
2. 前往Coding申请HTTPS证书
3. 前往阿里云解析**启用**国外路线
4. 前往Github申请HTTPS证书

整个过程就是这样，之所以不能调换顺序，是因为Coding的Pages服务器和Let's Encrypt的服务器都在国外，要想通过Let's Encrypt证书颁发检验只能一个一个的颁发。

## 注意事项以及部分问题的解决办法  
1. 上传分支后，只能推送一次就再也没有反应了或者第一次CI部署成功后，文件都变样了
   > 请检查源代码分支是否在`source`分支上，或者检查部署分支与写作的分支是否不再同一条分支上。
2. 提示HTTPS证书过期了怎么办
   > 通常情况下都是Coding上的服务器证书过期，此时只要重复上文中**HTTPS设置**的前两步即可重新申请一个有效证书，Github会自动续期证书。Coding证书每三个月需要手工维护一次
3. 如何得知部署是否成功
   > 首先检查CI状态是否为`SUCCESS`，其次可以前往Github或者Coding的主页上，看`README.md`文件，上面会自动列出本次部署的最新情况
4. Pages分支最好Github和Coding保持一致，不要错误的将编译后的及静态文件推送到写作分支上

## 参考资料
* [Gitalk设置指南](https://github.com/gitalk/gitalk)
* [Hux](https://github.com/Huxpro/huxpro.github.io)
* <a href="https://withdewhua.space/2018/09/18/Blog_3/">将JEKYLL博客同时托管在GITHUB PAGES和CODING PAGES | BLOG折腾小记（3）</a>