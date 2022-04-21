[![version](https://img.shields.io/vscode-marketplace/v/WhenSunset.Wiki-ws.svg?style=flat-square&label=vscode%20marketplace)](https://marketplace.visualstudio.com/items?itemName=WhenSunset.Wiki-ws) [![installs](https://img.shields.io/vscode-marketplace/d/WhenSunset.Wiki-ws.svg?style=flat-square)](https://marketplace.visualstudio.com/items?itemName=WhenSunset.Wiki-ws) [![GitHub stars](https://img.shields.io/github/stars/whenSunSet/wiki-ws.svg?style=flat-square&label=github%20stars)](https://github.com/whenSunSet/wiki-ws)

## Introduce

Wiki-WS is a VSCode plugin designed to help users quickly build a "personal knowledge base". With Wiki-WS you can deploy Wiki.js (an open source knowledge base website) with one click. You can use VSCode as the editor of Wiki.js, let our knowledge base enjoy the plug-in ecology of VSCode, and improve the efficiency of operating "personal knowledge base".

## Use

### 1.Premise

Before using Wiki-WS you need to confirm the following things:
- 1. You have installed **VSCode**
- 2. You have installed the **Wiki-WS** plugin
- 3. If you want to use the **automatic deployment of Wiki.js** function of the plugin, you also need to ensure that Docker has been installed on your computer and that Docker is **running**.

### 2.Operation guide

#### (0).Wiki.js manual deployment
[Click here for manual deployment of Wiki.js](https://github.com/whenSunSet/wiki-js-deploy)

#### (1).Wiki.js automatic deployment
![wiki自动部署](https://github.com/whenSunSet/image-lib/blob/master/wiki自动部署.gif?raw=true)

- **If automatic deployment fails, manual deployment can be performed**
- If you don't deploy Wiki.js yourself, you can use the auto-deployment feature in Wiki-WS to deploy Wiki.js to your local machine.
- Because the automatic deployment function relies on Docker, please make sure that Docker is installed and running on your machine, and you also need to make sure that your network is normal, because the pulling of Docker images requires the use of the network.

#### (2).Wiki.js自动部署后查看
![wiki自动部署后查看](https://github.com/whenSunSet/image-lib/blob/master/wiki自动部署后查看.gif?raw=true)
- If you successfully deployed Wiki.js via the auto-deploy feature. Then you need to click [here](http://wiki.heshixi.com/zh/Wiki-ws/Important) to read some important tips

#### (3).从知识库中获取文件
![wiki文件获取](https://github.com/whenSunSet/image-lib/blob/master/wiki文件获取.gif?raw=true)
- If you have initialized the Wiki-WS plugin, you can obtain the files in the knowledge base by searching and batch pulling

#### (4).在 VSCode 中查看知识库的文件
![wiki文件查看](https://github.com/whenSunSet/image-lib/blob/master/wiki文件查看.gif?raw=true)
- You can view the repository's files in VSCode, because the files are in Markdown format, so you can install the Markdown plugin in VSCode for a better preview and editing experience.
- Since the knowledge base is a website, you can also access this file in your browser.

#### (5).在 VSCode 中修改知识库的文件
![wiki文件修改](https://github.com/whenSunSet/image-lib/blob/master/wiki文件修改.gif?raw=true)
- After you have pulled the repository file, you can edit it in VSCode.
- Changes to files are periodically synced to the repository.
- At the same time, there is the status of the current file at the bottom of VSCode, you can confirm whether the file has been saved to the knowledge base by observing the status.
- If you are Vimer or Emacser, you can get a better editing experience by installing plugins for Vim and Emacs in VSCode.

#### (6).在 VSCode 中删除知识库的文件
![wiki文件删除](https://github.com/whenSunSet/image-lib/blob/master/wiki文件删除.gif?raw=true)
- You can delete individual files in a repository in VSCode.
- You can also batch delete all files in a directory in the repository in VSCode.
- **Deletion operation is irreversible, please operate with caution. **

#### (7).在 VSCode 中上传文件到知识库
![wiki文件上传](https://github.com/whenSunSet/image-lib/blob/master/wiki文件上传.gif?raw=true)
- You can upload a single file to the repository in VSCode.
- You can also upload all files in a folder to the repository in VSCode.

#### (8).在 VSCode 中上传资源文件到知识库
![wiki资源上传](https://github.com/whenSunSet/image-lib/blob/master/wiki资源上传.gif?raw=true)
- Except for Markdown files, other files in the knowledge base exist as resource files.
- The knowledge base cannot modify the resource file, but we can use VSCode to re-upload the resource after modifying it through other applications.
- The same resource files are only single upload and batch upload

#### (9).在 VSCode 中下载知识库中的资源
![wiki资源下载](https://github.com/whenSunSet/image-lib/blob/master/wiki资源下载.gif?raw=true)
- You can download the resource files in the knowledge base through VScode
- The way to download a single resource is to enter the url link of that resource.
- If you know the folder name of a resource in the knowledge base, you can also use it to download all resource files in the folder to the local.

#### (10).在 VSCode 中删除知识库中的资源
![wiki资源删除](https://github.com/whenSunSet/image-lib/blob/master/wiki资源删除.gif?raw=true)
- Resource files can be deleted individually or in batches
- **Deletion operation is irreversible, please operate with caution. **

#### (11).清理自动部署的 Wiki.js
![wiki自动部署后删除](https://github.com/whenSunSet/image-lib/blob/master/wiki自动部署后删除.gif?raw=true)
- If you don't want to deploy Wiki.js on your current computer, you can use the cleanup function.
- Note that after cleaning, the data folder of Wiki.js will not be completely deleted, but will be renamed. But the Wiki.js program will be killed.
- The renamed Wiki.js data folder can be migrated to another computer and redeployed.


## Abnormal situation

### 1.Automatic deployment failed

[Click to see why automatic deployment may fail](http://wiki.heshixi.com/zh/Wiki-ws插件/为什么会失败)

### 2.What if Wiki.js is already deployed elsewhere

After entering no when the Wiki-WS plugin is initialized, follow the prompts to enter the relevant information.

### 3.If you have other problems that cannot be solved, please contact me through the following channels

- Email：a1018998632@gmail.com
- WeChat: a1018998632(Please note overtime)

## 四、赞助

**If this plugin can help you, please give the author a cup of coffee if you don't mind :)**
![WhenSunsetAlipay](https://cdn.jsdelivr.net/gh/whenSunSet/image-lib/WhenSunsetAlipay.jpg)