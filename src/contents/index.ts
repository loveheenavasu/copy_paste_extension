import type { PlasmoCSConfig } from "plasmo";

export const config: PlasmoCSConfig = {
  matches: ["http://*/*", "https://*/*"],
  all_frames: true,
};

interface UserData {
  stripeSubscriptionId?: string;
  email?: string;
  message: string;
}

let startNode = null;
let endNode = null;
let selectedText = "";
let isSelectionCompleted = false;
const bracketStartElementClass = "copy-in-click-ext-bracket-start";
const bracketEndElementClass = "copy-in-click-ext-bracket-end";
let blinkingInterval;
let targetElement = null;
let userData: UserData | null = null;

const fetchUserData = () => {
  chrome.runtime.sendMessage({ action: "fetchUserData" }, function (response) {
    console.log("FETCH TUN CONTENT");
    if (response.error) {
      console.error(response.error);
      userData = null;
    } else {
      console.log("response", response);
      userData = response;
      chrome.storage.sync.set({ userData: response });
    }
  });
};

fetchUserData();

// Listen for changes in chrome storage
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "sync" && changes.userData) {
    userData = changes.userData.newValue;
    console.log("Updated userData:", userData);
  }
});

const renderPopup = () => {
  const isSubscribed = userData?.stripeSubscriptionId;

  // Create overlay
  const overlay = document.createElement("div");
  overlay.className = "copy-in-click-ext-popup"; // Add class

  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 999998; /* Place it below the popup */
    background-color: rgba(0, 0, 0, 0.5); /* Semi-transparent black */
  `;
  document.body.appendChild(overlay);

  function closePopup() {
    // Remove overlay and popup
    overlay.remove();
    popup.style.opacity = "0";
    setTimeout(() => {
      popup.remove();
      window.getSelection().removeAllRanges();
      resetAll();
      // Clear brackets in input/textarea after clicking "OK"
      if (targetElement) {
        const inputValue = targetElement.value;
        targetElement.value = inputValue.replace(/\[|\]/g, "");
        targetElement = null;
      }
    }, 100);
  }

  const popup = document.createElement("div");
  popup.className = "copy-in-click-ext-popup";

  popup.style.cssText = `
    position: fixed;
    top: 30%;
    left: 50%;
    transform: translate(-50%, -50%);
    background-color: #ffffff;
    z-index: 999999;
    border-radius: 8px;
    box-shadow: rgba(0, 0, 0, 0.35) 0px 5px 15px;
    opacity: 0;
    transition: opacity 0.2s ease; 
  `;

  const popupText = isSubscribed
    ? "Text has been copied to clipboard.<br> Click on the CopyIn2Clicks extension icon to view!"
    : `Text has been copied to clipboard.<br> Click on the CopyIn2Clicks extension icon to view!<br>Want to keep the original formatting?<br><a href="https://www.copyin2clicks.com/premium" target = "_blank" style="color: blue; text-decoration: underline;">Click here to learn how to upgrade and enjoy enhanced copying features!</a>`;

  // Add content to the popup
  popup.innerHTML = `
    <div>
      <div style="display:flex;justify-content:center;padding:8px;padding-bottom:0;" >
        <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" width="48" height="48" viewBox="0 0 256 256" xml:space="preserve">
          <defs></defs>
          <g style="stroke: none; stroke-width: 0; stroke-dasharray: none; stroke-linecap: butt; stroke-linejoin: miter; stroke-miterlimit: 10; fill: none; fill-rule: nonzero; opacity: 1;" transform="translate(1.4065934065934016 1.4065934065934016) scale(2.81 2.81)" >
            <polygon points="37.95,64.44 23.78,50.27 30.85,43.2 37.95,50.3 59.15,29.1 66.22,36.17 " style="stroke: none; stroke-width: 1; stroke-dasharray: none; stroke-linecap: butt; stroke-linejoin: miter; stroke-miterlimit: 10; fill: rgb(0,158,4); fill-rule: nonzero; opacity: 1;" transform="  matrix(1 0 0 1 0 0) "/>
            <path d="M 45 90 C 20 90 0 70 0 45 C 0 20 20 0 45 0 c 25 0 45 20 45 45 C 90 70 70 90 45 90 z M 45 10 c -19 0 -35 16 -35 35 s 16 35 35 35 s 35 -16 35 -35 S 64 10 45 10 z" style="stroke: none; stroke-width: 1; stroke-dasharray: none; stroke-linecap: butt; stroke-linejoin: miter; stroke-miterlimit: 10; fill: rgb(0,158,4); fill-rule: nonzero; opacity: 1;" transform=" matrix(1 0 0 1 0 0) " stroke-linecap="round" />
          </g>
        </svg>
      </div>
      <div style="padding: 20px; padding-top: 8px;">
        <div style="padding:4px;color:black;font-weight:bold; text-align:center;" >${popupText}</div>
          <div style="display:flex;justify-content:center;margin-top:16px" >
            <button id="closeButton" style="border:1px solid #3c82f6;border-radius:6px;padding:4px 40px;background:#3c82f6;color:white;cursor:pointer;font-weight:bold;">OK</button>
          </div>
      </div>
    </div>
  `;

  document.body.appendChild(popup);
  popup.offsetHeight;
  popup.style.opacity = "1";
  const closeButton = popup.querySelector("#closeButton");
  closeButton.addEventListener("click", closePopup);
  overlay.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
  });
};

const renderErrorPopup = (errorMessage: string) => {
  const errorPopup = document.createElement("div");
  errorPopup.className = "copy-in-click-ext-popup"; // Add class

  errorPopup.style.cssText = `
    position: fixed;
    top: 30%;
    left: 50%;
    transform: translate(-50%, -50%);
    background-color: #ffffff;
    z-index: 999999;
    border-radius: 8px;
    box-shadow: rgba(0, 0, 0, 0.35) 0px 5px 15px;
    opacity: 0;
    transition: opacity 0.2s ease; 
    padding: 20px;
    text-align: center;
  `;
  errorPopup.innerHTML = `
  <div style="display:flex;justify-content:center;padding:8px;padding-bottom:0;" >

  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="48" height="48" fill="red"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
  </div>

  <div style="padding: 20px; padding-top: 8px;">
  <div style="padding:4px;color:red;font-weight:bold;" >${errorMessage}</div>

</div>
  `;
  document.body.appendChild(errorPopup);
  errorPopup.offsetHeight;
  errorPopup.style.opacity = "1";
  setTimeout(() => {
    errorPopup.style.opacity = "0";
    setTimeout(() => {
      errorPopup.remove();
    }, 300);
  }, 1500); // Remove error popup after 3 seconds
};

const renderUpgradePopup = (message: string, showOkButton: boolean) => {
  const upgradePopup = document.createElement("div");
  upgradePopup.className = "copy-in-click-ext-popup"; // Add class

  upgradePopup.style.cssText = `
    position: fixed;
    top: 30%;
    left: 50%;
    transform: translate(-50%, -50%);
    background-color: #ffffff;
    z-index: 999999;
    border-radius: 8px;
    box-shadow: rgba(0, 0, 0, 0.35) 0px 5px 15px;
    opacity: 0;
    transition: opacity 0.2s ease; 
    padding: 20px;
    text-align: center;
  `;
  upgradePopup.innerHTML = `
    <div style="display:flex;justify-content:center;padding:8px;padding-bottom:0;" >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="48" height="48" fill="#f59e0b"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/></svg>
    </div>
    <div style="padding: 20px; padding-top: 8px;">
      <div style="padding:4px;color:#f59e0b;font-weight:bold;" >${message}</div>
      ${showOkButton ? `<button id="okButton" style="margin-top: 10px; background-color: #f59e0b; color: #fff; border: none; padding: 5px 10px; border-radius: 5px; cursor: pointer; outline: none;">OK</button>` : ""}
    </div>
  `;
  document.body.appendChild(upgradePopup);
  upgradePopup.offsetHeight;
  upgradePopup.style.opacity = "1";

  if (showOkButton) {
    const okButton = upgradePopup.querySelector("#okButton");
    okButton.addEventListener("click", () => {
      upgradePopup.style.opacity = "0";
      setTimeout(() => {
        upgradePopup.remove();
      }, 200);
    });
  } else {
    setTimeout(() => {
      upgradePopup.style.opacity = "0";
      setTimeout(() => {
        upgradePopup.remove();
      }, 500);
    }, 3000); // Remove upgrade popup after 3 seconds
  }
};

function isEventInPopup(event) {
  return event.target.closest(".copy-in-click-ext-popup") !== null;
}

// for default copy text

document.addEventListener("keydown", function (event) {
  const target = event.target;

  if ((event.ctrlKey || event.metaKey) && event.key === "c") {
    if (typeof chrome.storage === "undefined") {
      console.error("chrome.storage is not available.");
      return;
    }

    chrome.storage.local.get(
      ["isOn", "useStandardCopy", "format"],
      function (result) {
        const isOn = result.isOn === true || result.isOn === "true";
        const useStandardCopy =
          result.useStandardCopy === true || result.useStandardCopy === "true";
        const format = result.format === true || result.format === "true";

        // If both isOn and useStandardCopy are true, copy the selected text to the clipboard
        if (isOn && useStandardCopy) {
          if (isEventInPopup(event)) {
            return;
          }
          const selection = window.getSelection().toString();
          if (selection) {
            saveCopiedText(selection, target, format, useStandardCopy);
          }
        }
      }
    );
  }
});

// for copy using alt.key
document.addEventListener("click", function (event) {
  if (typeof chrome.storage === "undefined") {
    console.error("chrome.storage is not available.");
    return;
  }
  if (event.altKey || event.metaKey) {
    // Exclude anchor tags
    event.preventDefault();
    chrome.storage.local.get(["isOn", "key", "format"], function (result) {
      if (result.isOn === true || result.isOn === "true") {
        const keyCombination = result.key || "altKey";
        const format = result.format === true || result.format === "true";
        if (event[keyCombination.replaceAll('"', "")]) {
          if (isEventInPopup(event)) {
            return;
          }
          if (window.location.hostname.includes("sites.google.com")) {
            renderErrorPopup(
              "CopyIn2Clicks is not supported on sites.google.com"
            );
            return;
          }
          const target = event.target;
          if (
            (target as HTMLElement).tagName === "INPUT" ||
            (target as HTMLElement).tagName === "TEXTAREA"
          ) {
            const cursorPosition = (
              target as HTMLInputElement | HTMLTextAreaElement
            ).selectionStart;
            const inputValue = (
              target as HTMLInputElement | HTMLTextAreaElement
            ).value;
            const openingBracketIndex = inputValue.indexOf("[");
            const closingBracketIndex = inputValue.indexOf("]");

            if (openingBracketIndex === -1) {
              // Insert opening bracket if not already present
              const newValue =
                inputValue.substring(0, cursorPosition) +
                "[" +
                inputValue.substring(cursorPosition);
              (target as HTMLInputElement | HTMLTextAreaElement).value =
                newValue;
              (target as HTMLInputElement | HTMLTextAreaElement).selectionEnd =
                cursorPosition + 1;
              (target as HTMLInputElement | HTMLTextAreaElement).focus();
            } else if (
              openingBracketIndex !== -1 &&
              closingBracketIndex === -1
            ) {
              // Insert closing bracket if opening bracket is already present
              if (cursorPosition > openingBracketIndex) {
                const newValue =
                  inputValue.substring(0, cursorPosition) +
                  "]" +
                  inputValue.substring(cursorPosition);
                (target as HTMLInputElement | HTMLTextAreaElement).value =
                  newValue;
                (
                  target as HTMLInputElement | HTMLTextAreaElement
                ).selectionEnd = cursorPosition + 1;
                (target as HTMLInputElement | HTMLTextAreaElement).focus();
                // Select the text between the brackets
                const selectedText = newValue.substring(
                  openingBracketIndex + 1,
                  cursorPosition
                );
                (
                  target as HTMLInputElement | HTMLTextAreaElement
                ).setSelectionRange(openingBracketIndex + 1, cursorPosition);
                saveCopiedText(selectedText, target, format, false);
              } else {
                const errorMessage =
                  "CopyIn2Clicks Error: Closing Bracket Must be Placed After the Opening Bracket";
                renderErrorPopup(errorMessage);
              }
            }
          } else {
            if (isSelectionCompleted) {
              isSelectionCompleted = false;
              resetAll();
            }
            if (!startNode) {
              startNode = findTextNodeFromPoint(event.clientX, event.clientY);
              addStartIcon(
                event.clientX,
                event.clientY,
                event.pageX,
                event.pageY
              );
            } else if (startNode) {
              endNode = findTextNodeFromPoint(event.clientX, event.clientY);
              addEndIcon(
                event.clientX,
                event.clientY,
                event.pageX,
                event.pageY,
                target,
                format
              );
            }
          }
        } else {
          resetAll();
        }
      }
    });
  } else {
    resetAll();
  }
});

function addStartIcon(x, y, pageX, pageY) {
  insertBrackets("[", x, y);
}

function addEndIcon(x, y, pageX, pageY, target, format) {
  const startBracket = document.querySelector(`.${bracketStartElementClass}`);
  if (!startBracket) return;

  const startBracketRect = startBracket.getBoundingClientRect();

  const endX = x;
  const endY = y;

  if (
    endY > startBracketRect.bottom ||
    (endY > startBracketRect.top && endX > startBracketRect.right)
  ) {
    insertBrackets("]", x, y);
    selectTextBetweenBrackets(target, format);
  } else {
    const errorMessage =
      "CopyIn2Clicks Error: Closing Bracket Must be Placed After the Opening Bracket";
    renderErrorPopup(errorMessage);
  }
}

// async function saveCopiedText(
//   hasText = "",
//   target = null,
//   format,
//   useStandardCopy
// ) {
//   chrome.storage.local.get(["lastLoggedInUser"], function (result) {
//     const lastUserEmail = result.lastLoggedInUser;
//     const isSubscribed = userData?.stripeSubscriptionId;
//     const userEmail = userData?.email || lastUserEmail?.replace(/"/g, "");
//     console.log("userEmail", userEmail);

//     // Function to count words in a string, excluding spaces and newlines
//     function countWords(text) {
//       return text.trim().split(/\s+/).length;
//     }

//     // Function to truncate text to the first 500 words, preserving spaces and newlines
//     function truncateText(text, maxWords) {
//       const words = text.trim().split(/\s+/);
//       if (words.length <= maxWords) {
//         return text;
//       }

//       let wordCount = 0;
//       let index = 0;
//       while (wordCount < maxWords && index < text.length) {
//         if (!/\s/.test(text[index])) {
//           if (index === 0 || /\s/.test(text[index - 1])) {
//             wordCount++;
//           }
//         }
//         index++;
//       }
//       return text.slice(0, index);
//     }

//     chrome.storage.local.get(["recentlyCopiedItems"], async (result) => {
//       let items = result?.recentlyCopiedItems || "[]";
//       items = Array.from(JSON.parse(items));
//       const maxItems =
//         items.filter((item) => item.email === lastUserEmail).length > 5
//           ? 15
//           : isSubscribed
//             ? 15
//             : 5;

//       if (selectedText === "" && !hasText) return;

//       const maxWords = isSubscribed ? 5000 : 500;
//       let textToCopy = hasText || selectedText;
//       let isTextTruncated = false;

//       if (countWords(textToCopy) > maxWords && !isSubscribed) {
//         textToCopy = truncateText(textToCopy, maxWords);
//         isTextTruncated = true;

//         if (useStandardCopy) {
//           renderUpgradePopup(
//             `Text has been copied but due to the free tier 500 word limit.<br/>only the first 500 words will be saved.!<br/><a href="https://extension-landing-page-zeta.vercel.app/premium" target="_blank" style="color:#f59e0b; text-decoration: underline;">✨ Click here to enjoy unlimited copying today! ✨</a>`,
//             true
//           );
//         } else {
//           renderUpgradePopup(
//             `Free tier in CopyIn2Clicks is limited to 500 words.<br/> Get CopyIn2Clicks Premium now and copy any amount of text effortlessly!<br/><a href="https://extension-landing-page-zeta.vercel.app/premium" target="_blank" style="color:#f59e0b; text-decoration: underline;">✨ Click here to enjoy unlimited copying today! ✨</a>`,
//             true
//           );
//           return;
//         }
//       }
//       console.log(userData.message, "ffff");

//       const newItem = {
//         id: new Date().getTime(),
//         text: textToCopy,
//         starred: false,
//         email: userEmail, // Include user email in the item
//         isLogout: userData.message === "Unauthorized" ? true : false,
//       };
//       items.unshift(newItem);

//       while (
//         items.filter((item) => item.email === lastUserEmail).length > maxItems
//       ) {
//         let unstarredIndex = -1;
//         for (let i = items.length - 1; i >= 0; i--) {
//           if (items[i].email === lastUserEmail && !items[i].starred) {
//             unstarredIndex = i;
//             break;
//           }
//         }
//         if (unstarredIndex !== -1) {
//           items.splice(unstarredIndex, 1);
//         } else {
//           // If all items are starred, remove the oldest item
//           items.pop();
//         }
//       }

//       if (items.filter((item) => item.email === userEmail).length > 15) {
//         const lastIndex = items
//           .map((item) => item.email)
//           .lastIndexOf(userEmail);
//         if (lastIndex !== -1 && !items[lastIndex].starred) {
//           items.splice(lastIndex, 1);
//         } else {
//           for (let i = items.length - 1; i >= 0; i--) {
//             if (items[i].email === userEmail && !items[i].starred) {
//               items.splice(i, 1);
//               break;
//             }
//           }
//         }
//       }

//       await chrome.storage.local.set({
//         recentlyCopiedItems: JSON.stringify(items),
//       });

//       if (isSubscribed && format) {
//         const selection = window.getSelection();
//         const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
//         const div = document.createElement("div");
//         if (range) {
//           div.appendChild(range.cloneContents());
//         }
//         const html = div.innerHTML;
//         console.log(html, "hhhhhh"); // Check if the HTML includes color styles

//         await navigator.clipboard.write([
//           new ClipboardItem({
//             "text/plain": new Blob([newItem.text], { type: "text/plain" }),
//             "text/html": new Blob([html], { type: "text/html" }),
//           }),
//         ]);
//       } else {
//         await navigator.clipboard.writeText(newItem.text);
//       }

//       isSelectionCompleted = true;
//       if (!isTextTruncated || isSubscribed) {
//         setTimeout(() => renderPopup(), 500);
//       }
//     });
//   });
// }

async function saveCopiedText(
  hasText = "",
  target = null,
  format,
  useStandardCopy
) {
  chrome.storage.local.get(["lastLoggedInUser"], function (result) {
    const lastUserEmail = result.lastLoggedInUser;
    const isSubscribed = userData?.stripeSubscriptionId;
    const userEmail = userData?.email || lastUserEmail?.replace(/"/g, "");
    console.log("userEmail", userEmail);

    // Function to count words in a string, excluding spaces and newlines
    function countWords(text) {
      return text.trim().split(/\s+/).length;
    }

    // Function to truncate text to the first 500 words, preserving spaces and newlines
    function truncateText(text, maxWords) {
      const words = text.trim().split(/\s+/);
      if (words.length <= maxWords) {
        return text;
      }

      let wordCount = 0;
      let index = 0;
      while (wordCount < maxWords && index < text.length) {
        if (!/\s/.test(text[index])) {
          if (index === 0 || /\s/.test(text[index - 1])) {
            wordCount++;
          }
        }
        index++;
      }
      return text.slice(0, index);
    }
    function cleanExtraNewLines(text) {
      return text.replace(/(\r\n|\n|\r){2,}/g, "\n").trim();
    }

    chrome.storage.local.get(["recentlyCopiedItems"], async (result) => {
      let items = result?.recentlyCopiedItems || "[]";
      items = Array.from(JSON.parse(items));
      const maxItems =
        items.filter((item) => item.email === lastUserEmail).length > 5
          ? 15
          : isSubscribed
            ? 15
            : 5;

      if (selectedText === "" && !hasText) return;

      const maxWords = isSubscribed ? 5000 : 500;
      let textToCopy = hasText || selectedText;
      let isTextTruncated = false;

      if (countWords(textToCopy) > maxWords) {
        textToCopy = truncateText(textToCopy, maxWords);
        isTextTruncated = true;
        if (!isSubscribed) {
          if (useStandardCopy) {
            renderUpgradePopup(
              `Text has been copied but due to the free tier 500 word limit!<br/>only the first 500 words will be saved!<br/><a href="https://www.copyin2clicks.com/premium" target="_blank" style="color:#f59e0b; text-decoration: underline;">✨ Click here to enjoy unlimited copying today! ✨</a>`,
              true
            );
          } else {
            renderUpgradePopup(
              `Free tier in CopyIn2Clicks is limited to 500 words!<br/> Get CopyIn2Clicks Premium now and copy any amount of text effortlessly!<br/><a href="https://www.copyin2clicks.com/premium" target="_blank" style="color:#f59e0b; text-decoration: underline;">✨ Click here to enjoy unlimited copying today! ✨</a>`,
              true
            );
            return;
          }
        } else {
          renderUpgradePopup(
            `Text has been truncated to the first 5000 words due to the limit for premium users!`,
            true
          );
          // return;
        }
      }

      console.log(userData.message, "ffff");

      const newItem = {
        id: new Date().getTime(),
        lastModifiedTimestamp: new Date().getTime(),
        text: textToCopy,
        starred: false,
        email: userEmail,
        isLogout: userData.message === "Unauthorized" ? true : false,
      };
      items.unshift(newItem);

      while (
        items.filter((item) => item.email === lastUserEmail).length > maxItems
      ) {
        let unstarredIndex = -1;
        for (let i = items.length - 1; i >= 0; i--) {
          if (items[i].email === lastUserEmail && !items[i].starred) {
            unstarredIndex = i;
            break;
          }
        }
        if (unstarredIndex !== -1) {
          items.splice(unstarredIndex, 1);
        } else {
          // If all items are starred, remove the oldest item
          items.pop();
        }
      }

      if (items.filter((item) => item.email === userEmail).length > 15) {
        const lastIndex = items
          .map((item) => item.email)
          .lastIndexOf(userEmail);
        if (lastIndex !== -1 && !items[lastIndex].starred) {
          items.splice(lastIndex, 1);
        } else {
          for (let i = items.length - 1; i >= 0; i--) {
            if (items[i].email === userEmail && !items[i].starred) {
              items.splice(i, 1);
              break;
            }
          }
        }
      }

      await chrome.storage.local.set({
        recentlyCopiedItems: JSON.stringify(items),
      });

      if (useStandardCopy && !isSubscribed) {
        // Copy the full text to the clipboard
        await navigator.clipboard.writeText(
          cleanExtraNewLines(hasText || selectedText)
        );
      } else if (isSubscribed && format) {
        const selection = window.getSelection();
        const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
        const div = document.createElement("div");
        if (range) {
          div.appendChild(range.cloneContents());
        }
        const html = div.innerHTML;
        console.log(html, "hhhhhh"); // Check if the HTML includes color styles

        await navigator.clipboard.write([
          new ClipboardItem({
            "text/plain": new Blob([newItem.text], { type: "text/plain" }),
            "text/html": new Blob([html], { type: "text/html" }),
          }),
        ]);
      } else {
        await navigator.clipboard.writeText(cleanExtraNewLines(newItem.text));
      }

      isSelectionCompleted = true;
      if (!isTextTruncated) {
        setTimeout(() => renderPopup(), 500);
      }
    });
  });
}

function resetEndBracketOnly() {
  endNode = null;
  let bracketEnd = document.querySelectorAll(`.${bracketEndElementClass}`);
  if (bracketEnd) bracketEnd.forEach((bracket) => bracket.remove());
}

function selectTextBetweenBrackets(target, format) {
  const startBracket = document.querySelector(`.${bracketStartElementClass}`);
  const endBracket = document.querySelector(`.${bracketEndElementClass}`);
  if (startBracket && endBracket) {
    const range = document.createRange();
    range.setStartAfter(startBracket);
    range.setEndBefore(endBracket);

    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);

    selectedText = selection.toString();

    if (selectedText.trim() === "") {
      renderErrorPopup("CopyIn2Clicks Error: No text found between brackets");
      resetEndBracketOnly();
    } else {
      saveCopiedText(selectedText, target, format, false);
    }
  }
}

function insertBrackets(textContent, x, y) {
  let caretPosition;
  if (document.caretRangeFromPoint) {
    caretPosition = document.caretRangeFromPoint(x, y);
  } else if (document.caretPositionFromPoint) {
    const position = document.caretPositionFromPoint(x, y);
    const range = document.createRange();
    range.setStart(position.offsetNode, position.offset);
    range.setEnd(position.offsetNode, position.offset);
    caretPosition = range;
  }

  if (!caretPosition) return;

  const range = document.createRange();
  range.setStart(caretPosition.startContainer, caretPosition.startOffset);
  range.collapse(true);

  const startBracket = document.createElement("span");
  startBracket.textContent = textContent;
  if (textContent === "[") {
    startBracket.classList.add(bracketStartElementClass);
  } else {
    startBracket.classList.add(bracketEndElementClass);
  }

  range.insertNode(startBracket);

  let visible = true;
  blinkingInterval = setInterval(function () {
    startBracket.style.opacity = visible ? "0.2" : "1";
    visible = !visible;
  }, 500);
}

function resetAll() {
  startNode = null;
  endNode = null;
  selectedText = "";
  let bracketStart = document.querySelectorAll(`.${bracketStartElementClass}`);
  let bracketEnd = document.querySelectorAll(`.${bracketEndElementClass}`);
  if (bracketStart) bracketStart.forEach((bracket) => bracket.remove());
  if (bracketEnd) bracketEnd.forEach((bracket) => bracket.remove());
  clearInterval(blinkingInterval);
}

function findTextNodeFromPoint(x, y) {
  try {
    const elems = document.elementsFromPoint(x, y);
    for (const elem of elems) {
      if (elem.tagName === "A") {
        const walker = document.createTreeWalker(
          elem,
          NodeFilter.SHOW_TEXT,
          null
        );
        let node = walker.nextNode();
        while (node) {
          const range = document.createRange();
          range.selectNodeContents(node);
          const rects = range.getClientRects();
          for (const rect of rects) {
            if (
              x >= rect.left &&
              x <= rect.right &&
              y >= rect.top &&
              y <= rect.bottom
            ) {
              return { node, offset: getTextOffsetInNode(range, x, y) };
            }
          }
          node = walker.nextNode();
        }
      }
      const walker = document.createTreeWalker(
        elem,
        NodeFilter.SHOW_TEXT,
        null
      );
      let node = walker.nextNode();
      let nearestFirstNode = null;
      let nearestLastNode = null;
      do {
        const range = document.createRange();
        range.selectNodeContents(node);
        const rects = range.getClientRects();
        if (rects.length > 0) {
          if (!nearestFirstNode) {
            nearestFirstNode = node;
          }
          nearestLastNode = node;
        }
        for (const rect of rects) {
          if (
            x >= rect.left &&
            x <= rect.right &&
            y >= rect.top &&
            y <= rect.bottom
          ) {
            const offset = getTextOffsetInNode(range, x, y);
            return { node, offset, boundingRect: rect };
          }
        }
      } while ((node = walker.nextNode()));

      if (!startNode) {
        return { node: nearestFirstNode, offset: 0, boundingRect: null };
      } else {
        return {
          node: nearestLastNode,
          offset: nearestLastNode.length,
          boundingRect: null,
        };
      }
    }
  } catch (error) {
    renderErrorPopup("CopyIn2Clicks not Supported for Chosen Text!");
    console.error("Error in findTextNodeFromPoint:", error);
  }
  return null;
}

function getTextOffsetInNode(range, x, y) {
  const length = range.endOffset;
  for (let i = 0; i < length; i++) {
    range.setStart(range.startContainer, i);
    range.setEnd(range.startContainer, i + 1);
    const rect = range.getBoundingClientRect();
    if (
      x >= rect.left &&
      x <= rect.right &&
      y >= rect.top &&
      y <= rect.bottom
    ) {
      return i;
    }
  }
  return 0;
}
