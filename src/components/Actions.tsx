import React from "react";
import { AiOutlineCloseCircle } from "react-icons/ai";
import { HiOutlineDocumentDownload } from "react-icons/hi";
import { IoMdOpen } from "react-icons/io";
import { MdContentCopy } from "react-icons/md";
import ReactToolTip from "./ReactToolTip";
import { Storage } from "@plasmohq/storage";
import { useStorage } from "@plasmohq/storage/hook";
import { FaStar, FaRegStar } from "react-icons/fa";

const mimeTypes = {
  // Text-based formats
  txt: "text/plain",
  doc: "application/msword",
  pdf: "application/pdf",
  csv: "text/csv",
  xml: "application/xml",
  html: "text/html",
  xhtml: "application/xhtml+xml",
  css: "text/css",
  js: "text/javascript",
  jsx: "text/javascript",
  json: "application/json",
  yaml: "text/yaml",
  yml: "text/yaml",
  log: "text/plain",
  md: "text/markdown",
  rtf: "application/rtf",
  ini: "text/plain",
  cfg: "text/plain",
  sql: "application/sql",
  sh: "application/x-sh",
  py: "text/x-python",
  java: "text/x-java-source",
  c: "text/x-c",
  cpp: "text/x-c++",
  cs: "text/x-csharp",
  php: "text/x-php",
  pl: "text/x-perl",
  rb: "text/x-ruby",

  // Document formats
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  odt: "application/vnd.oasis.opendocument.text",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

function Actions({ text, index, starred, toggleStar, showActions, userData }) {
  const storage = new Storage({ area: "local" });
  let [extension] = useStorage({ key: "extension", instance: storage });
  const [toolTip, setToolTip] = useStorage(
    { key: "alert", instance: storage },
    ""
  );

  async function onCopyToClipboard(text: string) {
    if(!userData.stripeSubscriptionId){
    setToolTip("Text has been copied to clipboard. Click on the CopyIn2Clicks extension to view!  Want to keep the original formatting? Click here to learn how to upgrade and enjoy enhanced copying features!");
    }else{
      setToolTip('Copied')
    }
    setTimeout(() => {
      setToolTip("");
    }, 1500);
    navigator.clipboard.writeText(text);
  }

  const onDownload = (text) => {
    if(!userData?.stripeSubscriptionId){
      setToolTip("Upgrade Premium To Download!")
      setTimeout(() => {
        setToolTip("");
      }, 500);
      return;
    }
    if (!extension) {
      setToolTip("Please Set File Extension!");
      setTimeout(() => {
        setToolTip("");
      }, 1000);
      return;
    }

    const mimeType =
      mimeTypes[extension.toLowerCase()] || "application/octet-stream";
    let fileContent;

    if (extension.toLowerCase() === "pdf") {
      const pageWidth = 612; // PDF page width
      const margin = 50;
      const maxTextWidth = pageWidth - margin * 2;
      const fontSize = 12;
      const lineHeight = fontSize * 1.2;
      const initialY = 700;
      const x = 50;
      let currentY = initialY;
      let lines = [];

      const words = text.split(" ");
      let currentLine = "";

      for (let word of words) {
        const testLine = currentLine + word + " ";
        const testLineWidth = testLine.length * fontSize * 0.6;
        if (testLineWidth > maxTextWidth && currentLine !== "") {
          lines.push(currentLine);
          currentLine = word + " ";
          currentY -= lineHeight;
        } else {
          currentLine = testLine;
        }
      }
      lines.push(currentLine);

      const textContent = lines
        .map((line, index) => {
          const y = initialY - index * lineHeight;
          const encodedLine = line.replace(/[()\\]/g, "\\$&");
          return `BT\n/F1 ${fontSize} Tf\n${x} ${y} Td\n(${encodedLine}) Tj\nET`;
        })
        .join("\n");

      fileContent = `
%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>
endobj
4 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
5 0 obj
<< /Length ${textContent.length + 50} >>
stream
${textContent}
endstream
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000056 00000 n 
0000000112 00000 n 
0000000179 00000 n 
0000000275 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
342
%%EOF
`;
    } else {
      fileContent = text;
    }

    const file = new Blob([fileContent], { type: mimeType });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(file);
    link.download = `copyIn2Clicks.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setToolTip("Downloaded!");
    setTimeout(() => {
      setToolTip("");
    }, 500);
  };

  function onOpenInNewTab(text: string) {
    const newWindow = window.open("Text", "_blank");
    newWindow.document.title = "CopyIn2Clicks";
    newWindow.document.write(
      '<pre style="font-size: 14px; white-space: pre-wrap;">' + text + "</pre>"
    );
  }

  function onRemove(index: number) {
    chrome.storage.local.get(["recentlyCopiedItems"], (result) => {
      let items = result.recentlyCopiedItems
        ? JSON.parse(result.recentlyCopiedItems)
        : [];
      if (index >= 0 && index < items.length) {
        items.splice(index, 1);
        chrome.storage.local.set({
          recentlyCopiedItems: JSON.stringify(items),
        });
        setToolTip("Removed!");
        setTimeout(() => {
          setToolTip("");
        }, 500);
      }
    });
  }

  return (
    <div className="actions flex gap-0.5 self-end ">
      {showActions && (
        <>
          <div>
        <MdContentCopy
          id="copy-ext-icon"
          onClick={onCopyToClipboard.bind(this, text)}
          className="text-2xl cursor-pointer hover:scale-110 active:scale-95 transition-all duration-100 no-focus-outline"
        />
        <ReactToolTip
          text="Copy"
          anchorSelect="#copy-ext-icon"
          place="bottom-start"
        />
      </div>
      <div>
        <HiOutlineDocumentDownload
          onClick={onDownload.bind(this, text)}
          id="download-ext-icon"
          className={`text-2xl cursor-pointer hover:scale-110  active:scale-95 transition-all duration-100 no-focus-outline ${!extension  &&  "hover:scale-100 hover:cursor-default text-gray-400"}`}
        />
        <ReactToolTip
          text={extension ? "Download" : "Please Set File Extension!"}
          anchorSelect="#download-ext-icon"
          place="bottom-start"
        />
      </div>
      <div>
        <IoMdOpen
          onClick={onOpenInNewTab.bind(this, text)}
          id="new-tab-ext-icon"
          className="text-2xl cursor-pointer hover:scale-110  active:scale-95 transition-all duration-100 no-focus-outline"
        />
        <ReactToolTip
          text="Open In New Tab"
          anchorSelect="#new-tab-ext-icon"
          place="bottom-start"
        />
      </div>
      <div>
        <AiOutlineCloseCircle
          id="remove-ext-icon"
          onClick={onRemove.bind(this, index)}
          className="text-2xl cursor-pointer hover:scale-110  active:scale-95 transition-all duration-100 no-focus-outline"
        />
        <ReactToolTip
          text="Remove"
          anchorSelect="#remove-ext-icon"
          place="bottom-start"
        />
      </div>
        </>
      )}
    
      <div>
        {starred ? (
          <FaStar
            id="starred-icon"
            onClick={() => toggleStar(index)}
            className="text-2xl cursor-pointer text-yellow-500 hover:scale-110 active:scale-95 transition-all duration-100 no-focus-outline"
          />
        ) : (
          <FaRegStar
            id="unstarred-icon"
            onClick={() => toggleStar(index)}
            className="text-2xl cursor-pointer hover:scale-110 active:scale-95 transition-all duration-100 no-focus-outline"
          />
        )}
        <ReactToolTip
          text="Unstar Save Item"
          anchorSelect="#starred-icon"
          place="bottom-end"
        />
        <ReactToolTip
          text="Star to Save Item from Automatic Deletion"
          anchorSelect="#unstarred-icon"
          place="bottom-end"
        />
      </div>
    </div>
  );
}

export default Actions;
