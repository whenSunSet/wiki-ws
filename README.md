[![version](https://img.shields.io/vscode-marketplace/v/WhenSunset.Wiki-ws.svg?style=flat-square&label=vscode%20marketplace)](https://marketplace.visualstudio.com/items?itemName=WhenSunset.Wiki-ws) [![installs](https://img.shields.io/vscode-marketplace/d/WhenSunset.Wiki-ws.svg?style=flat-square)](https://marketplace.visualstudio.com/items?itemName=WhenSunset.Wiki-ws) [![GitHub stars](https://img.shields.io/github/stars/whenSunSet/wiki-ws.svg?style=flat-square&label=github%20stars)](https://github.com/whenSunSet/wiki-ws)

[English](https://github.com/whenSunSet/wiki-ws/blob/master/README-English.md)

## 一、介绍

Wiki-WS 是一款旨在帮助用户快速构建“个人知识库”的 VSCode 插件。通过 Wiki-WS 您可以一键部署 Wiki.js(一个开源知识库网站)。可以让 VSCode 作为 Wiki.js 的编辑器，让我们的知识库享受到 VSCode 的插件生态，提升操作“个人知识库“的效率。 

## 二、使用

### 1.前提

在使用 Wiki-WS 之前您需要确认以下几个事项：
- 1.您已经安装了 **VSCode**
- 2.您已经安装了 **Wiki-WS** 插件
- 3.您想要使用插件的**自动部署 Wiki.js** 功能，那么还需要保证您的电脑上已经安装了 Docker，且 Docker 处于**运行状态**。

### 2.操作指南

#### (1).Wiki.js自动部署
![wiki自动部署](https://github.com/whenSunSet/image-lib/blob/master/wiki自动部署.gif?raw=true)

- 如果您没有自己部署 Wiki.js 的话，可以使用 Wiki-WS 中的自动部署功能，将 Wiki.js 部署到本机。
- 因为自动部署功能依赖 Docker，所以请确认您的机器上安装了 Docker 且处于运行状态，同时还需要确保您的网络正常，因为 Docker 镜像的拉取需要使用网络。

#### (2).Wiki.js自动部署后查看
![wiki自动部署后查看](https://github.com/whenSunSet/image-lib/blob/master/wiki自动部署后查看.gif?raw=true)
- 如果您通过自动部署功能，成功部署了 Wiki.js。那么您需要点击[这里](http://wiki.heshixi.com/zh/Wiki-ws插件/重要提示)，阅读一些重要的提示

#### (3).从知识库中获取文件
![wiki文件获取](https://github.com/whenSunSet/image-lib/blob/master/wiki文件获取.gif?raw=true)
- 如果您已经将 Wiki-WS 插件初始化完毕了，那么您可以通过搜索和批量拉取的方式获取知识库中的文件

#### (4).在 VSCode 中查看知识库的文件
![wiki文件查看](https://github.com/whenSunSet/image-lib/blob/master/wiki文件查看.gif?raw=true)
- 您可以在 VSCode 中查看知识库的文件，因为文件是 Markdown 格式的，所以您可以在 VSCode 中安装 Markdown 插件以获得更好的预览和编辑体验。
- 因为知识库是一个网站，所以您还可以在浏览器中访问这个文件。

#### (5).在 VSCode 中修改知识库的文件
![wiki文件修改](https://github.com/whenSunSet/image-lib/blob/master/wiki文件修改.gif?raw=true)
- 您在拉取了知识库文件之后，可以在 VSCode 中对该文件进行编辑。
- 文件的改动会周期性的同步到知识库中。
- 同时 VSCode 的底部有当前文件的状态，您可以通过观察状态来确认文件是否已经保存到了知识库中。
- 如果您是 Vimer 或者 Emacser，那么您可以通过在 VSCode 中安装 Vim 和 Emacs 的插件以获取更好的编辑体验。

#### (6).在 VSCode 中删除知识库的文件
![wiki文件删除](https://github.com/whenSunSet/image-lib/blob/master/wiki文件删除.gif?raw=true)
- 您可以在 VSCode 中删除知识库中的单个文件。
- 您也可以在 VSCode 中批量删除知识库中某个目录中的所有文件。
- **删除操作是不可逆的，请谨慎操作。**

#### (7).在 VSCode 中上传文件到知识库
![wiki文件上传](https://github.com/whenSunSet/image-lib/blob/master/wiki文件上传.gif?raw=true)
- 您可以在 VSCode 中上传单个文件到知识库中。
- 您也可以在 VSCode 中将某个文件夹里的所有文件上传到知识库中。

#### (8).在 VSCode 中上传资源文件到知识库
![wiki资源上传](https://github.com/whenSunSet/image-lib/blob/master/wiki资源上传.gif?raw=true)
- 知识库中除了 Markdown 文件，其他文件都是以资源文件的类型存在的。
- 知识库不能对资源文件进行修改，但是我们可以通过其他应用程序修改了之后，然后使用 VSCode 重新上传该资源。
- 同样资源文件也只是单个上传与批量上传

#### (9).在 VSCode 中下载知识库中的资源
![wiki资源下载](https://github.com/whenSunSet/image-lib/blob/master/wiki资源下载.gif?raw=true)
- 您可以通过 VScode 对知识库中的资源文件进行下载
- 下载单个资源的方式是输入该资源的 url 链接。
- 如果您知道在知识库中，某个资源的文件夹名称，您还可以通过它下载该文件夹中所有的资源文件到本地。

#### (10).在 VSCode 中删除知识库中的资源
![wiki资源删除](https://github.com/whenSunSet/image-lib/blob/master/wiki资源删除.gif?raw=true)
- 资源文件可以被单个或者批量删除
- **删除操作是不可逆的，请谨慎操作。**

#### (11).清理自动部署的 Wiki.js
![wiki自动部署后删除](https://github.com/whenSunSet/image-lib/blob/master/wiki自动部署后删除.gif?raw=true)
- 如果您不想在当前计算机上部署 Wiki.js 了，那么可以使用清理功能。
- 注意清理之后，Wiki.js 的数据文件夹不会被彻底删除，而是会被重命名。但是 Wiki.js 的程序会被杀死。
- 重命名后的 Wiki.js 数据文件夹，可以迁移到其他计算机上，重新部署。 


## 三、问题

### 1.自动部署失败

[点击查看自动部署可能失败的原因](http://wiki.heshixi.com/zh/Wiki-ws插件/为什么会失败)

### 2.已经在其他地方部署了 Wiki.js 怎么办

Wiki-WS 插件初始化的时候输入 no 之后，按照提示输入相关信息。

### 3.有其他无法解决的问题请通过下面这些渠道联系我

- Email：a1018998632@gmail.com
- WeChat: a1018998632(加时请备注来意)

## 四、赞助

**如果这个插件能够帮助到您，不介意的话，请作者喝一杯咖啡吧:)**
![WhenSunsetAlipay](https://cdn.jsdelivr.net/gh/whenSunSet/image-lib/WhenSunsetAlipay.jpg)