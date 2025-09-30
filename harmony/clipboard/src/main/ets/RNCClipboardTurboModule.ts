/**
 * MIT License
 *
 * Copyright (C) 2023 Huawei Device Co., Ltd.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import { TurboModule, TurboModuleContext } from '@rnoh/react-native-openharmony/ts';
import { pasteboard, BusinessError } from '@kit.BasicServicesKit';
import util from '@ohos.util';
import image from '@ohos.multimedia.image';
import logger from './Logger';
import abilityAccessCtrl, { Permissions } from '@ohos.abilityAccessCtrl';
import url from '@ohos.url';

const TAG = "RNCClipboardTurboModule"
const prefixPNG = "data:image/png;base64,"
const prefixJPG = "data:image/jpg;base64,"
const PERMISSIONS: Array<Permissions> = [
  'ohos.permission.READ_PASTEBOARD'
]

export class RNCClipboardTurboModule extends TurboModule {
  constructor(protected ctx: TurboModuleContext) {
    super(ctx);
    logger.debug(TAG, "RNCClipboardTurboModule constructor");
  }

  getConstants() {
    logger.debug(TAG, "RNCClipboardTurboModule call getConstants");
    return {};
  }

  getString(): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      this.requestPermission().then(res => {
        if (res) {
          let systemPasteboard = pasteboard.getSystemPasteboard();
          systemPasteboard.getData().then((pasteData) => {
            let text = pasteData.getPrimaryText();
            logger.debug(TAG, `getString,text out:${text}`);
            resolve(text);
          }).catch((err) => {
            logger.error(TAG, `getString,Failed to get PasteData. Cause:${err.message}`);
            reject(err);
          })
        } else {
          reject({
            code: 0,
            message: "User refuses authorization"
          })
        }
      })
    });
  }

  getStrings(): Promise<string[]> {
    return new Promise<string[]>((resolve, reject) => {
      this.requestPermission().then(res => {
        if (res) {
          logger.debug(TAG, "call getStrings fun");
          let systemPasteboard = pasteboard.getSystemPasteboard();
          systemPasteboard.getData().then((pasteData) => {
            let count = pasteData.getRecordCount();
            let resultSet = []
            logger.debug(TAG, `getStrings fun,getRecordCount :${count}`);
            for (let index = 0; index < count; index++) {
              let record = pasteData.getRecord(index)
              if (record.mimeType == pasteboard.MIMETYPE_TEXT_PLAIN) {
                resultSet.push(record.plainText)
              }
            }
            resolve(resultSet)
          }).catch((err) => {
            logger.error(TAG, `getString fun,Failed to get PasteData. Cause:${err.message}`);
            reject(err)
          })
        } else {
          reject({
            code: 0,
            message: "User refuses authorization"
          })
        }
      })
    });
  }

  setString(content: string) {
    logger.debug(TAG, "setString fun");
    let systemPasteboard = pasteboard.getSystemPasteboard();
    let dataText = content;
    let pasteData = pasteboard.createData(pasteboard.MIMETYPE_TEXT_PLAIN, dataText);
    systemPasteboard.setData(pasteData).then((data) => {
      logger.debug(TAG, "setString fun,Succeeded PasteData");
    }).catch((err) => {
      logger.error(TAG, `setString fun,Failed to set PasteData.setString, Cause:${err.message}`);
    });
    return;
  }

  hasString(): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      this.requestPermission().then(res => {
        if (res) {
          logger.debug(TAG, "RNCClipboardTurboModule call hasString fun");
          let systemPasteboard = pasteboard.getSystemPasteboard();
          systemPasteboard.getData().then((pasteData) => {
            let count = pasteData.getRecordCount();
            resolve(count > 0)
          }).catch((err) => {
            logger.error(TAG, `RNCClipboardTurboModule hasString,Failed to get PasteData. Cause:${err.message}`);
            reject(err)
          })
        } else {
          reject({
            code: 0,
            message: "User refuses authorization"
          })
        }
      })
    });
  }

  hasNumber(): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      this.requestPermission().then(res => {
        if (res) {
          logger.debug(TAG, "[RNOH]:RNCClipboardTurboModule call hasNumber");
          let systemPasteboard = pasteboard.getSystemPasteboard();
          let reg = /^[\d]*$/;
          systemPasteboard.getData().then((pasteData) => {
            let count = pasteData.getRecordCount();
            let result = false
            for (let index = 0; index < count; index++) {
              let record = pasteData.getRecord(index);
              if (record.mimeType == pasteboard.MIMETYPE_TEXT_PLAIN && reg.test(record.plainText)) {
                result = true
                logger.debug(TAG, `[RNOH]:RNCClipboardTurboModule hasNumber,result out:${result}`);
                break
              }
            }
            resolve(result)
          }).catch((err) => {
            logger.error(TAG, `[RNOH]: hasNumber,Failed to get PasteData. Cause:${err.message}`);
            reject(err)
          })
        } else {
          reject({
            code: 0,
            message: "User refuses authorization"
          })
        }
      })
    });
  }

  // ios
  getImagePNG(): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      this.requestPermission().then(res => {
        if (res) {
          logger.debug(TAG, "[RNOH]:RNCClipboardTurboModule call getImagePNG");
          let systemPasteboard = pasteboard.getSystemPasteboard();

          systemPasteboard.getData().then((pasteData) => {
            let pixMap = pasteData.getPrimaryPixelMap();
            //packer方式
            const imagePackerApi = image.createImagePacker();
            let packOpt: image.PackingOption = {
              format: "image/png",
              quality: 96
            }
            imagePackerApi.packing(pixMap, packOpt).then(data => {
              let uint8Array = new Uint8Array(data);
              let base64Helper = new util.Base64Helper();
              let base64Str = base64Helper.encodeToStringSync(uint8Array, util.Type.BASIC)
              let finalStr = prefixPNG + base64Str
              resolve(finalStr)
            }).catch((err) => {
              logger.error(TAG, "[RNOH]:RNCClipboardTurboModule call getImagePNG,failed to packing");
              reject(err)
            })
            imagePackerApi.release().then(() => {
              logger.debug(TAG, "[RNOH]:RNCClipboardTurboModule call getImagePNG, releasing image packaging");
            }).catch((error: BusinessError) => {
              logger.error(TAG, "[RNOH]:RNCClipboardTurboModule call getImagePNG, releasing image packaging error");
            })

          }).catch((err) => {
            logger.error(TAG, "[RNOH]:RNCClipboardTurboModule call getImagePNG,failed to getData");
            reject(err)
          })
        } else {
          reject({
            code: 0,
            message: "User refuses authorization"
          })
        }
      });
    });
  }

  // ios
  getImageJPG(): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      this.requestPermission().then(res => {
        if (res) {
          logger.debug(TAG, "[RNOH]:RNCClipboardTurboModule call getImageJPG");
          let systemPasteboard = pasteboard.getSystemPasteboard();

          systemPasteboard.getData().then((pasteData) => {
            let pixMap = pasteData.getPrimaryPixelMap();

            //packer方式
            const imagePackerApi = image.createImagePacker();
            let packOpt: image.PackingOption = {
              format: "image/jpeg",
              quality: 96
            }
            imagePackerApi.packing(pixMap, packOpt).then(data => {
              let uint8Array = new Uint8Array(data);
              let base64Helper = new util.Base64Helper();
              let base64Str = base64Helper.encodeToStringSync(uint8Array, util.Type.BASIC)
              let finalStr = prefixJPG + base64Str
              resolve(finalStr)
            }).catch((err) => {
              logger.error(TAG, "[RNOH]:RNCClipboardTurboModule call getImageJPG,failed to packing");
              reject(err)
            })
            imagePackerApi.release().then(() => {
              logger.debug(TAG, "[RNOH]:RNCClipboardTurboModule call getImageJPG, releasing image packaging");
            }).catch((error: BusinessError) => {
              logger.error(TAG, "[RNOH]:RNCClipboardTurboModule call getImageJPG, releasing image packaging error");
            })

          }).catch((err) => {
            logger.error(TAG, "[RNOH]:RNCClipboardTurboModule call getImageJPG,failed to getData");
            reject(err)
          })
        } else {
          reject({
            code: 0,
            message: "User refuses authorization"
          })
        }
      });
    });
  }

  setImage(content: string) {
    logger.debug(TAG, `[RNOH]:RNCClipboardTurboModule call setImage:${content}`);
    let iconBase64 = content

    let base64 = new util.Base64Helper();
    let uint8 = base64.decodeSync(iconBase64, util.Type.BASIC)
    let arrayBuffer = uint8.buffer.slice(uint8.byteOffset, uint8.byteLength + uint8.byteOffset)
    let imageSource: image.ImageSource = image.createImageSource(arrayBuffer);
    logger.debug(TAG, "[RNOH]:RNCClipboardTurboModule call setImage100");

    imageSource.getImageInfo().then(value => {
      let hValue = Math.round(value.size.height);
      let wValue = Math.round(value.size.width);
      let defaultSize: image.Size = {
        height: hValue,
        width: wValue
      };
      let opts: image.DecodingOptions = {
        editable: true,
        desiredSize: defaultSize
      };
      logger.debug(TAG, "[RNOH]:RNCClipboardTurboModule call setImage200");
      imageSource.createPixelMap(opts).then((pixMap) => {
        let iconPixelMap = pixMap
        logger.debug(TAG, "[RNOH]:RNCClipboardTurboModule call setImage300");
        imageSource.release()

        let systemPasteboard = pasteboard.getSystemPasteboard();
        systemPasteboard.getData().then((pasteData) => {
          let record = pasteboard.createRecord(pasteboard.MIMETYPE_PIXELMAP, iconPixelMap)
          pasteData.addRecord(record)

          systemPasteboard.setData(pasteData).then((data: void) => {
            logger.debug(TAG, "[RNOH]:RNCClipboardTurboModule call setImage305,successed in setting pasteData");
          }).catch((err) => {
            logger.error(TAG, "[RNOH]:RNCClipboardTurboModule call setImage305,failed in setting pasteData");
          })
        }).catch((err) => {
          logger.debug(TAG, `[RNOH]:RNCClipboardTurboModule call setImage,failed get pasteData.cause:${err.message}`);
        })
      })
    })

  }

  getImage(): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      logger.debug(TAG, "[RNOH]:RNCClipboardTurboModule call getImage");
      resolve("demo-todo")
    });
  }

  setStrings(content: string[]) {
    logger.debug(TAG, "[RNOH]:RNCClipboardTurboModule call setStrings fun");
    let systemPasteboard = pasteboard.getSystemPasteboard();
    systemPasteboard.clear().then(() => {
      systemPasteboard.getData().then((pasteData) => {
        while(content.length > 0) {
          pasteData.addRecord(pasteboard.MIMETYPE_TEXT_PLAIN, content.pop())
        }

        // setData
        systemPasteboard.setData(pasteData).then((data: void) => {
          logger.debug(TAG, "setStrings,Succeeded in setting PasteData.");
        }).catch((err) => {
          logger.error(TAG, `setStrings,Failed to set PasteData. Cause:${err.message}`);
        });
      }).catch((err) => {
        logger.error(TAG, `setStrings,getData error,Cause:${err.message}`);
      })
    }).catch((err: BusinessError) => {
      console.error(`Failed to clear the PasteData. Cause: ${err.message}`);
    });
    return;
  }

  hasImage(): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      this.requestPermission().then(res => {
        if (res) {
          logger.debug(TAG, "RNCClipboardTurboModule call hasImage");
          let systemPasteboard = pasteboard.getSystemPasteboard();
          systemPasteboard.getData().then((pasteData) => {
            let pixelMapObj = pasteData.getPrimaryPixelMap();
            let result = false
            if (pixelMapObj) {
              logger.debug(TAG, "RNCClipboardTurboModule call hasImage,hasPixelobj");
              result = true
            }
            resolve(result)
          }).catch((err) => {
            logger.error(TAG, `hasImage,Failed to get PasteData. Cause:${err.message}`);
            reject(err)
          })
        } else {
          reject({
            code: 0,
            message: "User refuses authorization"
          })
        }
      });
    });
  }

  hasURL(): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      this.requestPermission().then(res => {
        if (res) {
          logger.debug(TAG, "RNCClipboardTurboModule call hasWebURL");
          let systemPasteboard = pasteboard.getSystemPasteboard();
          systemPasteboard.getData().then((pasteData) => {
            let count = pasteData.getRecordCount();
            let result = false;
            let isValidUrl = (string) => {
              try {
                url.URL.parseURL(string);
                return true;
              } catch (err) {
                return false;
              }
            };
            for (let index = 0; index < count; index++) {
              let record = pasteData.getRecord(index);
              if (record.mimeType == pasteboard.MIMETYPE_TEXT_URI) {
                if (isValidUrl(record.uri)) {
                  logger.debug(TAG, "hasURL,mimeType=MIMETYPE_TEXT_URI");
                  result = true
                  break
                }
              } else if (record.mimeType == pasteboard.MIMETYPE_TEXT_PLAIN) {
                if (isValidUrl(record.plainText)) {
                  logger.debug(TAG, "hasURL,find URL in MIMETYPE_TEXT_PLAIN");
                  result = true
                  break
                }
              }
            }
            resolve(result)
          }).catch((err) => {
            logger.error(TAG, `[RNOH]: hasURL,Failed to get PasteData. Cause:${err.message}`);
            reject(err)
          });
        } else {
          reject({
            code: 0,
            message: "User refuses authorization"
          })
        }
      });
    });
  }

  hasWebURL(): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      this.requestPermission().then(res => {
        if (res) {
          logger.debug(TAG, "RNCClipboardTurboModule call hasWebURL");
          let systemPasteboard = pasteboard.getSystemPasteboard();
          systemPasteboard.getData().then((pasteData) => {
            let count = pasteData.getRecordCount();
            let result = false
            let reg = /(http|ftp|https):\/\/[\w\-_]+(\.[\w\-_]+)+([\w\-\.,@?^=%&:/~\+#]*[\w\-\@?^=%&/~\+#])?/;

            for (let index = 0; index < count; index++) {
              let record = pasteData.getRecord(index);
              if (record.mimeType == pasteboard.MIMETYPE_TEXT_URI) {
                if (reg.test(record.uri)) {
                  logger.debug(TAG, "hasWebURL,find webURL in MIMETYPE_TEXT_URI");
                  result = true
                  break
                }
              } else if (record.mimeType == pasteboard.MIMETYPE_TEXT_PLAIN) {
                if (reg.test(record.plainText)) {
                  logger.debug(TAG, "hasWebURL,find webURL in MIMETYPE_TEXT_PLAIN");
                  result = true
                  break
                }
              }

            }
            resolve(result)
          }).catch((err) => {
            logger.error(TAG, `hasWebURL,Failed to get PasteData. Cause:${err.message}`);
            reject(err)
          });
        } else {
          reject({
            code: 0,
            message: "User refuses authorization"
          })
        }
      });
    });
  }

  requestPermission(): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      abilityAccessCtrl.createAtManager()
        .requestPermissionsFromUser(this.ctx.uiAbilityContext, PERMISSIONS).then(result => {
        if (result.authResults[0] == 0) {
          resolve(true);
        } else {
          logger.debug(TAG, `getString,text out:用户拒绝授权`);
          resolve(false);
        }
      }).catch(() => {
        logger.debug(TAG, `getString,text out:用户拒绝授权`);
        resolve(false);
      })
    });
  }
}
