# Wiki-ws

## 1.How to use

### (1).install

![0install](https://raw.githubusercontent.com/whenSunSet/image-lib/master/0install.png)
- 1.**search in vscode extension marketplace**
- 2.click install

### (2).use

### Ensure that Wiki.j is deployed
![0wiki](https://raw.githubusercontent.com/whenSunSet/image-lib/master/0wiki.png)
If not, then you can deploy here. [Wiki.js](https://docs.requarks.io/install/requirements)

### wiki.wiInitWiki
![1initWiki](https://raw.githubusercontent.com/whenSunSet/image-lib/master/1initWiki.webp)

The plugin should be initialized first.

So let's press F1 or Shift+Home+P(Show All Command)，then input **wiki.wiInitWiki** and press enter.

The plugin will let you enter the home page of wiki.js, For example **http://wiki.heshixi.com**, then press enter.

The plugin will let you enter the authorization key of wiki.js, then press enter.

You should now see a wiki directory appearing in the left workspace.

### wiki.wiSearchInWiki
![2searchInWiki](https://raw.githubusercontent.com/whenSunSet/image-lib/master/2searchFile.webp)

You can use this plugin to search for files in the Wiki, and changes are synchronized to the server in real time.

So let's press F1 or Shift+Home+P(Show All Command)，then input **wiki.wiSearchInWiki** and press enter.

Now you can enter the keyword you want to search for in the input box, the list will immediately display the search results.

### wiki.wiUploadFileToWiki

![3uploadFileToWiki](https://raw.githubusercontent.com/whenSunSet/image-lib/master/3uploadFile.webp)

You can upload markdown file that are not in Wiki to Wiki.

So let's open a menu for a markdown file in another workspace, Click the **wiUploadFileToWiki** button in the menu.

Wait for a while and you will see the file uploaded successfully toast.

### wiki.wiUploadFilesInDirToWiki
![4uploadFilesInDirToWiki](https://raw.githubusercontent.com/whenSunSet/image-lib/master/4uploadDir.webp)

You can upload markdown files that are not in Wiki to Wiki.

So let's open a menu for a directory in another workspace, Click the **wiUploadFilesInDirToWiki** button in the menu.

Wait for a while and you will see the many file uploaded successfully toast.

### wiki.wiDeleteFileFromWiki
![5deleteFileFromWiki](https://raw.githubusercontent.com/whenSunSet/image-lib/master/5deleteFile.webp)
You can delete a file on the wiki.

First use **wiki.wiSearchInWiki** command to fetch wiki file to local.

Then open this file menu, Click the **wiDeleteFileFromWiki** button in the menu. 

Wait for a while and you will see the toast deleted successfully.

### wiki.wiUploadAssetToWiki
![6uploadAssetToWiki](https://raw.githubusercontent.com/whenSunSet/image-lib/master/6uploadAsset.webp)
You can upload none markdown files to Wiki as resource.

So let's open a menu for a none markdown file in another workspace, Click the **wiUploadAssetToWiki** button in the menu.

Wait for a while and you will see the file uploaded successfully toast.