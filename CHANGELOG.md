# ChangeLog

- 2021.10.06: 0.9.0 published
  - wiki.initWiki: init Wiki.
  - wiki.resetWiki: clear local cache wiki file.
  - wiki.searchInWiki: search file in wiki.
  - Once the wiki file is modified, automatic uploads are triggered.
  - wiki.uploadFileToWiki: upload md file to wiki.
  - wiki.uploadFilesInDirToWiki: upload all md files in dir to wiki.
  - wiki.deleteFileFromWiki: delete wiki file.
  - wiki.uploadAssetToWiki: upload asset file(image, video...) to wiki.
- 2021.10.06: 0.9.3 published
  - Add README.md and CHANGELOG.md.
  - change activationEvents to "*".
- 2021.10.07: 0.9.9 published
  - README.md complete
- 2021.10.09: 1.0.0、1.0.1 published
  - empty md files can be uploaded to wiki.
  - wiki workspace files can be uploaded to wiki.
  - asset files are uploaded with directory information 
  - The URL is added to the clipboard after the asset file is uploaded
- 2021.10.10: 1.0.2 published
  - search wiki will show directorzy info.
- 2021.10.11: 1.0.3 published
  - Fix the problem of md file uploading failure caused by entering double quotation marks.
- 2021.10.12: 1.0.4 published
  - Fix upload failure caused by too large resource file.
  - Show the reasons for the failure of various operations.
- 2021.10.13: 1.0.5 published
  - Fix asset folder name invalid.
  - notify when asset folder create succeed.
- 2021.10.14: 1.0.6 published
  - The corresponding directory is automatically created when the MD file is downloaded.
- 2021.10.14: 1.0.7、1.0.8 published
  - You can delete MD files in batches.
  - Files can be fetch in batches from wikis.
- 2021.10.15: 1.0.7、1.0.9 published
  - Change content will debounce 2000ms.
- 2021.10.17: 1.0.95 published
  - Help users automatically deploy wiki.js
- 2021.10.17: 1.0.96 published
  - You can upload files in the wiki directory in batches
  - If the MD file in the wiki directory does not exist in wiki.js, you will be prompted to upload it in the lower right corner
- 2021.10.17: 1.0.97 published
  - Fix some bug
- 2021.10.17: 1.0.98 published
  - Fix some bug
- 2022.02.10: 1.2.8
  - 中文：新增多端数据同步，用户修改 wiki 内容时，如果本地数据与 wiki.js 数据不一致，会提示用户进行数据同步或者覆盖。
  - English：Multi-data synchronization is added. When you modify wiki content, if the local data is inconsistent with wiki.js data, the system prompts you to synchronize or overwrite the data
- 2022.02.11: 1.2.9
  - 中文：
    - 1.新增上传目录中所有资源文件的功能
    - 2.wiki 初始化的时候，如果当前不存在本地的 workspace 时，会自动在 ~/.Wiki-WS 中创建 temp 目录，以方便用户将临时文件放在里面。
  - English：
    - 1.Added the function of uploading all resource files in a directory 
    - 2.During wiki initialization, if there is no local workspace, the temp directory is automatically created in ~/. Wiki-ws so that users can store temporary files in it.
- 2022.02.13: 1.3.0
  - 中文：
    - 1.新增下载某文件夹中的所有资源文件的功能。
    - 2.新增删除某文件夹中的所有资源文件的功能。
    - 3.优化了所有功能的文案描述。
    - 4.优化了资源批量上传的功能。
  - English：
    - 1.Add the function of downloading all resource files in a folder.
    - 2.Added the function of deleting all resource files in a folder.
    - 3.Optimized copywriting description of all functions.
    - 4.Optimize the function of batch upload of resources.
- 2022.02.13: 1.3.1
  - 中文：修复 url 包含中文时下载失败的问题。
  - English：Fix the problem of download failure when the URL contains Chinese.
- 2022.02.13: 1.3.2
  - 中文：
    - 1.新增通过链接下载单个资源文件的功能。
    - 2.新增文件删除单个资源的功能。
  - English：
    - 1.Added the function of downloading a single resource file through a link.
    - 2.Add the function of deleting a single resource from a file.
- 2022.04.05: 1.3.7
  - 中文：兼容 Windows
  - English：Compatible with windows
- 2022.04.18: 1.3.8
  - 中文：修改插件信息
  - English：update plugin info
- 2022.04.18: 2.0.0