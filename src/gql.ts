import { GraphQLClient, gql } from "graphql-request";
import axios from "axios";
import * as fs from "fs";
import FormData = require("form-data");
import * as wsutils from "./wsutils";

export async function queryWikiFileList(key: string) {
  const queryG = gql`query{pages{search(query:"${key}"){results{id,title}}}}`;
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
  const queryG = gql`mutation{pages{update(id:${id},content:"${content}",tags:[""],isPublished:true){responseResult{errorCode,succeeded,slug,message}}}}`;
  console.log("wiki changeWikiContent id:" + id);
  const data = await wsutils.graphQLClient.request(queryG);
  return data;
}

export async function createWikiNewFile(content: string, description: string, path: string, title: string) {
  const queryG = gql`mutation{
        pages{
          create(
            content:"${content}",description:"${description}",editor:"markdown",isPublished:true,isPrivate:false,locale:"zh",path:"${path}",tags:[""],title:"${title}"){
            responseResult{
              succeeded
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

export async function uploadAssetToWiki(filePath: string) {
  console.log("wiki uploadImageToWiki filePath:" + filePath);
  const localFile = fs.createReadStream(filePath);
  const formData = new FormData();
  formData.append("mediaUpload", "{\"folderId\":0}");
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