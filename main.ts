import fs from "fs";
import path from "path";

const fetchUrl = "https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1&mkt=zh-CN";
const urlprefix = "https://www.bing.com";
const urlsuffix = "_UHD.jpg";

async function fetchImageInfo(url: string) {
  const response = await fetch(url);
  const { images } = await response.json();
  if (images.length === 0) {
    console.error("No bing wallpaper found");
    return;
  }
  images[0].startdate = ~~images[0].startdate + 1;
  return images[0];
}

async function fetchImageBuffer(url: string) {
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  return buffer;
}

interface ImageInfo {
  title: string;
  urlbase: string;
  copyright: string;
  startdate: string;
};

async function writeImageBuffer(imageInfo: ImageInfo) {
  const { urlbase, startdate } = imageInfo;
  const buffer = await fetchImageBuffer(urlprefix + urlbase + urlsuffix);

  // It can work without checking for duplication.
  fs.writeFileSync(path.join(__dirname, "archive", `${startdate}.jpg`), new DataView(buffer));
};

async function writeImageInfo(imageInfo: ImageInfo) {
  const jsonPath = path.join(__dirname, "archive", `information.json`);
  const { title, copyright, startdate } = imageInfo;
  let jsonStr = fs.readFileSync(jsonPath, "utf8");
  let imageInfos: ImageInfo[] = JSON.parse(jsonStr);

  // If the imageInfo is already in the csv, do nothing.
  if (!imageInfos.find((x) => x.startdate === startdate)) {
    imageInfos.push({ startdate, title, copyright } as any);
    jsonStr = JSON.stringify(imageInfos, null, 2);
    fs.writeFileSync(jsonPath, jsonStr);

    console.info(`Image info of ${startdate} has been written.`);
  }

  // Update README.md
  const templatePath = path.join(__dirname, "template.md");
  const readmePath = path.join(__dirname, "README.md");
  let readmeStr = fs.readFileSync(templatePath, "utf8");
  readmeStr += `\n\n![${title}](./archive/${startdate}.jpg)\n\n`;
  readmeStr += `### List of Included Wallpapers\n\n`;
  readmeStr += `|date|title|copyright|\n|---|---|---|\n`;
  imageInfos.sort((a, b) => ~~b.startdate - ~~a.startdate);
  imageInfos.forEach((x) => {
    readmeStr += `|${x.startdate}|${x.title}|${x.copyright}|\n`;
  });
  fs.writeFileSync(readmePath, readmeStr);
}

async function main() {
  const imageInfo = await fetchImageInfo(fetchUrl);
  await writeImageBuffer(imageInfo);
  await writeImageInfo(imageInfo);
}

main();