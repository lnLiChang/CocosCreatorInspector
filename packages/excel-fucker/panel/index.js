let packageName = "excel-fucker";
let fs = require('fire-fs');
let path = require('fire-path');
let CfgUtil = Editor.require('packages://' + packageName + '/core/CfgUtil.js');
let excelItem = Editor.require('packages://' + packageName + '/panel/item/excelItem.js');
let nodeXlsx = Editor.require('packages://' + packageName + '/node_modules/node-xlsx');
let Electron = require('electron');
let uglifyJs = Editor.require('packages://' + packageName + '/node_modules/uglify-js');
let fsExtra = Editor.require('packages://' + packageName + '/node_modules/fs-extra');
let jsonBeautifully = Editor.require('packages://' + packageName + '/node_modules/json-beautifully');


Editor.Panel.extend({
    style: fs.readFileSync(Editor.url('packages://' + packageName + '/panel/index.css', 'utf8')) + "",
    template: fs.readFileSync(Editor.url('packages://' + packageName + '/panel/index.html', 'utf8')) + "",


    $: {},

    ready() {
        excelItem.init();
        window.plugin = new window.Vue({
            el: this.shadowRoot,
            created() {
                this._initPluginCfg();
            },
            init() {
            },
            data: {
                excelRootPath: null,

                isMergeJson: false,
                isFormatJson: false,// 是否格式化Json
                jsonSavePath: null,//json文件存放目录
                isJsonAllCfgFileExist: false,// 是否单一配置文件存在
                jsonAllCfgFileName: null,// json配置文件名

                jsSavePath: null,// 插件资源目录
                jsFileName: null,//js配置文件名
                isJsFileExist: false,
                isFormatJsCode: false,
                excelArray: [],
                excelFileArr: [],
            },
            methods: {
                onBtnClickTellMe() {
                    let url = "http://wpa.qq.com/msgrd?v=3&uin=774177933&site=qq&menu=yes";
                    Electron.shell.openExternal(url);
                },
                _saveConfig() {
                    let data = {
                        excelRootPath: this.excelRootPath,
                        jsFileName: this.jsFileName,
                        jsonAllFileName: this.jsonAllCfgFileName,
                        isMergeJson: this.isMergeJson,
                        isFormatJsCode: this.isFormatJsCode,
                        isFormatJson: this.isFormatJson,
                    };
                    CfgUtil.saveCfgByData(data);
                },
                _initPluginCfg() {
                    console.log("initCfg");
                    CfgUtil.initCfg(function (data) {
                        if (data) {
                            this.excelRootPath = data.excelRootPath || "";
                            if (fs.existsSync(this.excelRootPath)) {
                                this._onAnalyzeExcelDirPath(this.excelRootPath);
                            }
                            this.jsFileName = data.jsFileName || "GameJsCfg";
                            this.jsonAllCfgFileName = data.jsonAllFileName || "GameJsonCfg";
                            this.isMergeJson = data.isMergeJson;
                            this.isFormatJsCode = data.isFormatJsCode;
                            this.isFormatJson = data.isFormatJson;
                            this.checkJsFileExist();
                            this.checkJsonAllCfgFileExist();
                        }
                    }.bind(this));
                    this._initJsonSavePath();// 默认json路径
                },
                _initJsonSavePath() {
                    let projectPath = Editor.projectInfo.path;
                    let pluginResPath = path.join(projectPath, "plugin-resource");
                    if (!fs.existsSync(pluginResPath)) {
                        fs.mkdirSync(pluginResPath);
                    }
                    let jsonSavePath = path.join(pluginResPath, "json");
                    if (!fs.existsSync(jsonSavePath)) {
                        fs.mkdirSync(jsonSavePath);
                    }
                    this.jsonSavePath = jsonSavePath;

                    let jsSavePath = path.join(pluginResPath, "js");
                    if (!fs.existsSync(jsSavePath)) {
                        fs.mkdirSync(jsSavePath);
                    }
                    this.jsSavePath = jsSavePath;
                },
                onBtnClickFormatJson() {
                    this.isFormatJson = !this.isFormatJson;
                    this._saveConfig();
                },
                // 是否合并json
                onBtnClickMergeJson() {
                    this.isMergeJson = !this.isMergeJson;
                    this._saveConfig();

                },
                // 打开合并的json
                onBtnClickJsonAllCfgFile() {
                    let saveFileFullPath = path.join(this.jsonSavePath, this.jsonAllCfgFileName + ".json");
                    if (fs.existsSync(saveFileFullPath)) {
                        Electron.shell.openItem(saveFileFullPath);
                        Electron.shell.beep();
                    } else {
                        // this._addLog("目录不存在：" + this.resourceRootDir);
                        console.log("目录不存在:" + saveFileFullPath);
                        return;
                    }
                },
                checkJsonAllCfgFileExist() {
                    let saveFileFullPath = path.join(this.jsonSavePath, this.jsonAllCfgFileName + ".json");
                    if (fs.existsSync(saveFileFullPath)) {
                        this.isJsonAllCfgFileExist = true;
                    } else {
                        this.isJsonAllCfgFileExist = false;
                    }
                },
                onBtnClickFormatJsCode() {
                    this.isFormatJsCode = !this.isFormatJsCode;
                    this._saveConfig();
                },
                onBtnClickSelectExcelRootPath() {
                    let res = Editor.Dialog.openFile({
                        title: "选择Excel的根目录",
                        defaultPath: Editor.projectInfo.path,
                        properties: ['openDirectory'],
                    });
                    if (res !== -1) {
                        let dir = res[0];
                        this.excelRootPath = dir;
                        this._onAnalyzeExcelDirPath(dir);
                        this._saveConfig();
                    }
                },
                // 修改js配置文件
                onJsFileNameChanged() {
                    this._saveConfig();
                },
                // 修改json配置文件
                onJsonAllCfgFileChanged() {
                    this._saveConfig();
                },
                // 查找出目录下的所有excel文件
                _onAnalyzeExcelDirPath(dir) {
                    // let dir = path.normalize("D:\\proj\\CocosCreatorPlugins\\doc\\excel-fucker");
                    if (dir) {
                        // 查找json文件
                        let allFileArr = [];
                        let excelFileArr = [];
                        // 获取目录下所有的文件
                        readDirSync(dir);
                        // 过滤出来.xlsx的文件
                        for (let k in allFileArr) {
                            let file = allFileArr[k];
                            let extName = path.extname(file);
                            if (extName === ".xlsx" || extName===".xls") {
                                excelFileArr.push(file);
                            } else {
                                console.log("不支持的文件类型: " + file);
                            }
                        }

                        this.excelFileArr = excelFileArr;
                        // 组装显示的数据
                        let excelSheetArray = [];
                        for (let k in excelFileArr) {
                            let itemFullPath = excelFileArr[k];
                            // console.log("excel : " + itemFullPath);

                            let excelData = nodeXlsx.parse(itemFullPath);
                            //todo 检测重名的sheet
                            for (let j in excelData) {
                                let itemData = {
                                    isUse: true,
                                    fullPath: itemFullPath,
                                    name: "name",
                                    sheet: excelData[j].name
                                };
                                itemData.name = itemFullPath.substr(dir.length + 1, itemFullPath.length - dir.length);
                                excelSheetArray.push(itemData);
                            }
                        }
                        this.excelArray = excelSheetArray;


                        function readDirSync(dirPath) {
                            let dirInfo = fs.readdirSync(dirPath);
                            for (let i = 0; i < dirInfo.length; i++) {
                                let item = dirInfo[i];
                                let itemFullPath = path.join(dirPath, item);
                                let info = fs.statSync(itemFullPath);
                                if (info.isDirectory()) {
                                    // console.log('dir: ' + itemFullPath);
                                    readDirSync(itemFullPath);
                                } else if (info.isFile()) {
                                    let headStr = item.substr(0, 2);
                                    if (headStr === "~$") {
                                        console.log("检索到excel产生的临时文件:" + itemFullPath);
                                    } else {
                                        allFileArr.push(itemFullPath);
                                    }
                                    // console.log('file: ' + itemFullPath);
                                }
                            }
                        }
                    }
                },
                onBtnClickSelectSheet(event) {
                    let b = event.currentTarget.value;
                    for (let k in this.excelArray) {
                        this.excelArray[k].isUse = b;
                    }
                },
                onBtnClickOpenJsonSavePath() {
                    if (fs.existsSync(this.jsonSavePath)) {
                        Electron.shell.showItemInFolder(this.jsonSavePath);
                        Electron.shell.beep();
                    } else {
                        // this._addLog("目录不存在：" + this.resourceRootDir);
                        return;
                    }
                },
                onBtnClickOpenJsSavePath() {
                    if (fs.existsSync(this.jsSavePath)) {
                        Electron.shell.showItemInFolder(this.jsSavePath);
                        Electron.shell.beep();
                    } else {
                        // this._addLog("目录不存在：" + this.resourceRootDir);
                        return;
                    }
                },
                _getJavaScriptSaveData(excelData, itemSheet) {
                    let title = excelData[0];
                    let desc = excelData[1];
                    let sheetFormatData = {};
                    for (let i = 2; i < excelData.length; i++) {
                        let lineData = excelData[i];
                        let saveLineData = {};
                        for (let j = 1; j < title.length; j++) {
                            let key = title[j];
                            let value = lineData[j];
                            saveLineData[key] = value;
                        }
                        sheetFormatData[lineData[0].toString()] = saveLineData;
                    }
                    return sheetFormatData;
                },
                _getJsonSaveData(excelData, itemSheet) {
                    let title = excelData[0];
                    let desc = excelData[1];
                    let ret = null;
                    let useFormat1 = false;
                    if (useFormat1) {
                        let saveData1 = [];// 格式1:对应的为数组
                        for (let i = 2; i < excelData.length; i++) {
                            let lineData = excelData[i];
                            let saveLineData = {};
                            for (let j = 0; j < title.length; j++) {
                                let key = title[j];
                                let value = lineData[j];
                                // console.log("" + value);
                                saveLineData[key] = value;
                            }
                            saveData1.push(saveLineData);
                        }
                        ret = saveData1;
                    } else {
                        let saveData2 = {};// 格式2:id作为索引
                        for (let i = 2; i < excelData.length; i++) {
                            let lineData = excelData[i];
                            let saveLineData = {};
                            for (let j = 1; j < title.length; j++) {
                                let key = title[j];
                                let value = lineData[j];
                                // console.log("" + value);
                                saveLineData[key] = value;
                            }
                            saveData2[lineData[0].toString()] = saveLineData;
                        }
                        ret = saveData2;
                    }
                    return ret;
                },
                // 打开生成的js配置文件
                onBtnClickOpenJsFile() {
                    let saveFileFullPath = path.join(this.jsSavePath, this.jsFileName + ".js");
                    if (fs.existsSync(saveFileFullPath)) {
                        Electron.shell.openItem(saveFileFullPath);
                        Electron.shell.beep();
                    } else {
                        // this._addLog("目录不存在：" + this.resourceRootDir);
                        return;
                    }
                },
                // 检测js配置文件是否存在
                checkJsFileExist() {
                    let saveFileFullPath = path.join(this.jsSavePath, this.jsFileName + ".js");
                    if (fs.existsSync(saveFileFullPath)) {
                        this.isJsFileExist = true;
                    } else {
                        this.isJsFileExist = false;
                    }
                },
                // 生成配置
                onBtnClickGen() {
                    console.log("onBtnClickGen");
                    // 删除老的配置
                    fsExtra.emptyDirSync(this.jsonSavePath);
                    fsExtra.emptyDirSync(this.jsSavePath);
                    let jsSaveData = {};// 保存的js数据
                    let jsonAllSaveData = {};// 保存的json数据
                    for (let k in this.excelArray) {
                        let itemSheet = this.excelArray[k];
                        if (itemSheet.isUse) {
                            let excelData = nodeXlsx.parse(itemSheet.fullPath);
                            let sheetData = null;
                            for (let j in excelData) {
                                if (excelData[j].name === itemSheet.sheet) {
                                    sheetData = excelData[j].data;
                                }
                            }
                            if (sheetData) {
                                if (sheetData.length > 2) {
                                    // 保存为json
                                    let jsonSaveData = this._getJsonSaveData(sheetData, itemSheet);
                                    if (this.isMergeJson) {
                                        jsonAllSaveData[itemSheet.sheet] = jsonSaveData;
                                    } else {
                                        let saveStr = JSON.stringify(jsonSaveData);
                                        if (this.isFormatJson) {// 格式化json
                                            saveStr = jsonBeautifully(saveStr);
                                        }
                                        let saveFileFullPath = path.join(this.jsonSavePath, itemSheet.sheet + ".json");
                                        fs.writeFileSync(saveFileFullPath, saveStr);
                                        console.log("转换成json文件成功:" + saveFileFullPath);
                                    }
                                    // 保存为js
                                    let sheetJsData = this._getJavaScriptSaveData(sheetData, itemSheet);
                                    // 检测重复问题
                                    if (jsSaveData[itemSheet.sheet] === undefined) {
                                        jsSaveData[itemSheet.sheet] = sheetJsData;
                                    } else {
                                        console.log("发现重名sheet:" + itemSheet.name + "(" + itemSheet.sheet + ")");
                                    }
                                } else {
                                    console.log("行数低于2行,无效sheet:" + itemSheet.sheet);
                                }
                            } else {
                                console.log("未发现数据");
                            }

                        } else {
                            console.log("文件未启用: " + itemSheet.fullPath + '\\' + itemSheet.sheet);
                        }
                    }
                    // =====================>>>>  保存json文件   <<<=================================
                    if (this.isMergeJson) {
                        let saveFileFullPath = path.join(this.jsonSavePath, this.jsonAllCfgFileName + ".json");
                        let str = JSON.stringify(jsonAllSaveData);
                        if (this.isFormatJson) {
                            str = jsonBeautifully(str);
                        }
                        fs.writeFileSync(saveFileFullPath, str);
                        console.log("保存配置成功!");
                    }
                    // =====================>>>>  保存js文件   <<<=================================
                    // TODO 保证key的顺序一致性
                    let saveFileFullPath = path.join(this.jsSavePath, this.jsFileName + ".js");
                    let saveStr = "module.exports = " + JSON.stringify(jsSaveData) + ";";
                    if (this.isFormatJsCode) {// 保存为格式化代码
                        let ast = uglifyJs.parse(saveStr);
                        let ret = uglifyJs.minify(ast, {
                            output: {
                                beautify: true,//如果希望得到格式化的输出，传入true
                                indent_start: 0,//（仅当beautify为true时有效） - 初始缩进空格
                                indent_level: 4,//（仅当beautify为true时有效） - 缩进级别，空格数量
                            }
                        });
                        if (ret.error) {
                            console.log('error: ' + ret.error.message);
                        } else if (ret.code) {
                            fs.writeFileSync(saveFileFullPath, ret.code);
                            console.log("生成js文件成功:" + saveFileFullPath);
                            console.log("全部转换完成!");
                        } else {
                            console.log(ret);
                        }
                    } else {// 保存为单行代码
                        fs.writeFileSync(saveFileFullPath, saveStr);
                    }

                    this.checkJsFileExist();
                    this.checkJsonAllCfgFileExist();
                },

            },

        });
    },

    messages: {
        'excel-fucker:hello'(event) {
        }
    }
});