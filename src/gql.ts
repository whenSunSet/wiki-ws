import { GraphQLClient, gql } from "graphql-request";
import axios from "axios";
import * as fs from "fs";
import FormData = require("form-data");
import * as wsutils from "./wsutils";

export async function queryWikiFileList(key: string) {
  const queryG = gql`query{pages{search(query:"${key}"){results{id,title,path}}}}`;
  console.log("wiki queryWikiFileList key:" + key + ",queryG:" + queryG);
  const data = await wsutils.graphQLClient.request(queryG);
  return data;
}

export async function queryWikiFromId(id: number) {
  const queryG = gql`query{pages{single(id:${id}){content}}}`;
  console.log("wiki queryWikiFromId id:" + id + ",queryG:" + queryG);
  const data = await wsutils.graphQLClient.request(queryG);
  return data;
}

export async function changeWikiContent(id: number, content: string) {
  content = wsutils.escapeRegExp(content);
  const queryG = gql`mutation{pages{update(id:${id},content:"${content}",tags:[""],isPublished:true){responseResult{errorCode,succeeded,slug,message}}}}`;
  console.log("wiki changeWikiContent id:" + id);
  const data = await wsutils.graphQLClient.request(queryG);
  return data;
}

export async function createWikiNewFile(content: string, description: string, path: string, title: string) {
  content = wsutils.escapeRegExp(content);
  const queryG = gql`mutation{
        pages{
          create(
            content:"${content}",description:"${description}",editor:"markdown",isPublished:true,isPrivate:false,locale:"zh",path:"${path}",tags:[""],title:"${title}"){
            responseResult{
              succeeded
            }
            page{
              id
              content
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

export async function uploadAssetToWiki(filePath: string, folderId:number) {
  console.log("wiki uploadImageToWiki filePath:" + filePath + ",folderId:" + folderId);
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

    await axios.post(wsutils.imageUploadUrl, formData, { headers }).then(res => {
      console.log("上传成功", res.data);
    }).catch(res => {
      console.log(res.data);
    });
  });
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

export async function createAssetFolder(name: string) {
  const queryG = gql`mutation{
    assets{
      createFolder(parentFolderId:0, slug:"${name}", name:"${name}") {
        responseResult{
          succeeded
        }
      }
    }
  }`;

  console.log("wiki createAssetFolder name" + name);
  const data = await wsutils.graphQLClient.request(queryG);
  return data;
}