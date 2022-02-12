import { GraphQLClient, gql } from "graphql-request";
import axios from "axios";
import * as fs from "fs";
import FormData = require("form-data");
import * as wsutils from "./wsutils";
import * as vscode from "vscode";
import * as path from "path";
import { Readable } from 'form-data';

export async function queryWikiFileList(key: string) {
  const queryG = gql`query{pages{search(query:"${key}"){results{id,title,path}}}}`;
  console.log("wiki queryWikiFileList key:" + key + ",queryG:" + queryG);
  const data = await wsutils.graphQLClient.request(queryG);
  return data;
}

export async function queryWikiFromId(id: number) {
  const queryG = gql`query{pages{single(id:${id}){content,updatedAt}}}`;
  console.log("wiki queryWikiFromId id:" + id + ",queryG:" + queryG);
  const data = await wsutils.graphQLClient.request(queryG);
  return data;
}

export async function changeWikiContent(id: number, content: string, title: string) {
  content = wsutils.escapeRegExp(content);
  const queryG = gql`mutation{pages{update(id:${id},content:"${content}",tags:["${title}"],isPublished:true){responseResult{errorCode,succeeded,slug,message}}}}`;
  console.log("wiki changeWikiContent id:" + id);
  const data = await wsutils.graphQLClient.request(queryG);
  return data;
}

export async function createWikiNewFile(content: string, description: string, path: string, title: string) {
  content = wsutils.escapeRegExp(content);
  const queryG = gql`mutation{
        pages{
          create(
            content:"${content}",description:"${description}",editor:"markdown",isPublished:true,isPrivate:false,locale:"zh",path:"${path}",tags:["${title}"],title:"${title}"){
            responseResult{
              succeeded,
              message,
              errorCode,
              slug
            }
            page{
              id,
              content,
              updatedAt,
            }
          }
        }
      }`;
  const data = await wsutils.graphQLClient.request(queryG);
  console.log("wiki createWikiNewFile description:" + description + ",path:" + path + ",title:" + title);
  return data;
}

export async function deleteFileFromWiki(id: number) {
  const queryG = gql`mutation{
  pages{
    delete(id:${id}){
      responseResult{
        succeeded,
        errorCode,
        slug,
        message
      }
    }
  }
}`;

  console.log("wiki deleteFileFromWiki id:" + id);
  const data = await wsutils.graphQLClient.request(queryG);
  return data;
}

export async function deleteAssetFromWiki(id: number) {
  const queryG = gql`mutation{
  assets{
    deleteAsset(id:${id}){
      responseResult{
        succeeded,
        message
      }
    }
  }
}`;

  console.log("wiki deleteAssetFromWiki id:" + id);
  const data = await wsutils.graphQLClient.request(queryG);
  return data;
}



export async function uploadAssetToWiki(filePath: string, folderId: number, parentDirName: string, succeed: (assetUrl: string) => void, error: () => void) {
  console.log("wiki uploadImageToWiki filePath:" + filePath + ",folderId:" + folderId);
  if (wsutils.isWindows) {
    filePath = filePath.slice(1);
  }
  const localFile = fs.createReadStream(filePath);
  const formData = new FormData();
  formData.append("mediaUpload", "{\"folderId\":" + folderId + "}");
  formData.append("mediaUpload", localFile);

  const headers = formData.getHeaders();//获取headers
  //获取form-data长度
  formData.getLength(async function (err, length) {
    if (err) {
      return;
    }
    //设置长度，important!!!
    headers["content-length"] = length;
    headers["Authorization"] = wsutils.authorization;
    axios({
      method: 'post',
      url: wsutils.imageUploadUrl,
      data: formData,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      headers: headers
    }).then((value: any) => {
      console.log("wiki uploadAssetToWiki success path:" + filePath);
      const assetUrl = wsutils.wikiUrl + "/" + parentDirName.toLowerCase() + "/" + filePath.split("/").pop()?.toLowerCase().replace(/ /g, "_");
      succeed(assetUrl);

    }, (reason: any) => {
      error();
      console.error(reason);
      vscode.window.showErrorMessage("资源上传失败(Failed to upload a resource)" + reason.message);
    });
  });
  // return axios.post(wsutils.imageUploadUrl, formData, { headers });
}

export async function getFolderList() {
  const queryG = gql`query{
  assets{
    folders(parentFolderId:0){
      id,
      name
    }
  }
}`;

  console.log("wiki getFolderList");
  const data = await wsutils.graphQLClient.request(queryG);
  return data;
}

export async function getFolderIdFromName(localFolderName: string) {
  return getFolderList().then((data: any) => {
    let folderId: any = undefined;
    data.assets.folders.forEach((element: { id: number; name: string; }) => {
      if (localFolderName == element.name) {
        folderId = element.id;
      }
    });
    return folderId;
  });
}

export async function getAssetFromFold(folderId: number) {
  const queryG = gql`query{
  assets{
    list(folderId:${folderId}, kind:ALL){
      id,
      filename
    }
  }
}`;

  console.log("wiki getAssetFromFold folderId" + folderId);
  const data = await wsutils.graphQLClient.request(queryG);
  return data;
}

export async function getAssetFilenameFromFold(folderId: number) {
  return getAssetFromFold(folderId).then((data: any) => {
    let filenameList: Array<string> = [];
    data.assets.list.forEach((element: { id: number; filename: string; }) => {
      filenameList.push(element.filename);
    });
    return filenameList;
  });
}

export async function getAssetIdFromFold(folderId: number) {
  return getAssetFromFold(folderId).then((data: any) => {
    let idList: Array<number> = [];
    data.assets.list.forEach((element: { id: number; filename: string; }) => {
      idList.push(element.id);
    });
    return idList;
  });
}

export async function createAssetFolder(name: string) {
  const queryG = gql`mutation{
    assets{
      createFolder(parentFolderId:0, slug:"${name}", name:"${name}") {
        responseResult{
          succeeded,
          errorCode,
          slug,
          message
        }
      }
    }
  }`;

  console.log("wiki createAssetFolder name" + name);
  const data = await wsutils.graphQLClient.request(queryG);
  return data;
}

// url 是图片地址，如，http://wximg.233.com/attached/image/20160815/20160815162505_0878.png
// filepath 是文件下载的本地目录
// name 是下载后的文件名
export async function downloadWikiFile(url: string, filepath: string, name: string) {
	if (!fs.existsSync(filepath)) {
		fs.mkdirSync(filepath);
	}
	const mypath = path.resolve(filepath, name);
	if (fs.existsSync(mypath)) {
		fs.unlinkSync(mypath)
	}
	const writer = fs.createWriteStream(mypath);
	const response = await axios({
		url,
		method: "GET",
		responseType: "stream",
    headers: {
      "Authorization": wsutils.authorization
    }
	});
	(response.data as Readable).pipe(writer);
	// response.data.pipe(writer);
	return new Promise((resolve, reject) => {
		writer.on("finish", resolve);
	});
}