var express = require('express');
var router = express.Router();
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const PUBLIC_DIR = path.join(__dirname, '../public');
const CONFIG_DIR =  path.join(__dirname, '../config');
const CONFIG_INITTREE =  path.join(CONFIG_DIR, 'inittree.json');
const CONFIG_LIST =  path.join(CONFIG_DIR, 'config.list.json');
const CLOC_JSONFILE=path.join(__dirname, '../output.json');
const JSTREE_NODE_JSONFILE=path.join(__dirname, '../historyNodeInfo.json');

var rawdata = fs.readFileSync(CLOC_JSONFILE);
const clocResult = JSON.parse(rawdata);

var historyNodeInfo =null;
if(isFileExist(JSTREE_NODE_JSONFILE))
{
  rawdata = fs.readFileSync(JSTREE_NODE_JSONFILE);
  historyNodeInfo = JSON.parse(rawdata);
  rawdata = null;
}
else
{
  historyNodeInfo = {};
}
if(!isFileExist(CONFIG_INITTREE))
{
  var config = initTree(clocResult , '#');
  fs.writeFileSync(CONFIG_INITTREE , JSON.stringify({id:'inittree',title:'初始化', config:config}), 'utf8');
}
var configList = null;
if(isFileExist(CONFIG_LIST))
{
  rawdata = fs.readFileSync(CONFIG_LIST);
  configList = JSON.parse(rawdata);
  rawdata = null;
}
else
{
  configList = [];
  configList.push({id:'inittree',title:'初始化'});
}
console.log(`init tree complete `);

function initTree(clocResult,parentId)
{
  var data = [];
  var subFiles ={};
  var parent = parentId;
  if('#' == parentId)
  {
    parent = '';
  }
  clocResult.result.forEach(item => {
    var root = getRoot(item.name,parent);
    if(null != root)
    {
      if(subFiles.hasOwnProperty(root))
      {
        subFiles[root] += item.code;
      }
      else
      {
        subFiles[root] = item.code;
      }
    }
    
  });
  
  for (let key in subFiles) {
    var id = '';
    if('' == parent)
    {
      id = key;
    }
    else
    {
      id = `${parent}/${key}`;
    }
    var code = subFiles[key];
    var children = initTree(clocResult , id);
    data.push({ id: id, parent : parentId, text : `${key} (${code}) ` ,
                icon: (children.length>0)?'jstree-folder':'jstree-file',
                a_attr:{code:code}});
    children.forEach((item)=>{
      data.push(item);
    });
  }
  return data;
  
}

function isFileExist(path) {
  try{
      fs.accessSync(path,fs.F_OK);
  }catch(e){
      return false;
  }
  return true;
}

function hasChildren(filepath , fileArray)
{
  for(var index = 0 ; index < fileArray.length ; index ++)
  {
    var name = fileArray[index].name;
    if(name.startsWith(filepath))
    {
      if(name.length > filepath.length)
      {
        return true;
      }

    }
  }
  return false;
}
function getRoot(filepath , parent)
{
  var root = null;
  if('' == parent)
  {
    let result = filepath.split('/');
	  root = result[0];
    
  }
  else if(filepath.startsWith(parent))
  {
    let relativePath = filepath.replace(parent, '');
    if(relativePath.startsWith('/'))
    {
      relativePath = relativePath.replace( '/' , '');
    }
    let result = relativePath.split('/');
    root = result[0];
  }
  else
  {
    root = '';
  }

  if('' == root)
  {
    root = null;
  }

  return root;
}
/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

/* get root dir. */
router.get('/getrootdir.do', function(req, res, next) {
  res.json({root:clocResult.root});
});

/* get config */
router.get('/loadconfig.do', function(req, res, next) {
  var id = req.query.id;
  if('undefined' == typeof id)
  {
    if(0 == configList.length )
    {
      configList.push();
    }
    res.json(configList);
    return;
  }
  else
  {
    var rawdata = fs.readFileSync(path.join(CONFIG_DIR,`${id}.json`));
    res.json(JSON.parse(rawdata.toString()));
    return;
  }
  
});

/* save config. */
router.post('/saveconfig.do', function(req, res){
  var json = req.body;
  if(typeof json.id == 'undefined' || json.id == 'inittree')
  {
    json.id = uuidv4();
  }

  // save config
  fs.writeFileSync( path.join(CONFIG_DIR, `${json.id}.json`), JSON.stringify(json), 'utf8');
  
  //save to list
  var result = {id:json.id , title:json.title};
  var isNew = true;
  for(var index = 0 ; index  < configList.length ;index ++)
  {
    var item = configList[index];
    if(item.id == result.id)
    {
      item.title = result.title;
      isNew =false;
      break;
    }
  }
  if(isNew) configList.push(result);
  fs.writeFileSync(CONFIG_LIST, JSON.stringify(configList), 'utf8');

  //send 
  res.json(result);
});
/*delet config*/
router.get('/deleteconfig.do', function(req, res, next) {
  var id = req.query.id;
  if(id == 'inittree')
  {
    res.json({id:id});
    return;
  }
  fs.rmSync(path.join(CONFIG_DIR ,`${id}.json` ));
  var newConfigList = [];
  for(var index = 0 ; index  < configList.length ;index ++)
  {
    var item = configList[index];
    if(item.id != req.query.id)
    {
      newConfigList.push(item);
    }
  }
  configList = newConfigList;
  fs.writeFileSync(CONFIG_LIST, JSON.stringify(configList), 'utf8');
  //send 
  res.json({id:id});
});
router.get('/jstreelazy.do', function(req, res, next) {

  var data = null;
  var parentId =req.query.id;
  

  if(historyNodeInfo.hasOwnProperty(parentId))
  {
    data = historyNodeInfo[parentId];
    res.json(data);
    console.log(`cache used :${parentId}`);
    return;
  }
  else
  {
    data = [];
  }

  var parent = parentId;
  if('#' == parentId)
  {
    parent = '';
  }
  var subFiles ={};
  clocResult.result.forEach(item => {
    var root = getRoot(item.name,parent);
    //console.log(`${root} = ${item.name} ${parent}`);
    if(null != root)
    {
      if(subFiles.hasOwnProperty(root))
      {
        subFiles[root] += item.code;
      }
      else
      {
        subFiles[root] = item.code;

      }
    }
    
  });
  
  for (let key in subFiles) {
    var id = '';
    if('' == parent)
    {
      id = key;
    }
    else
    {
      id = `${parent}/${key}`;
    }
    var code = subFiles[key];
    var children = hasChildren(id , clocResult.result);
    data.push({ id: id, parent : parentId, text : `${key} (${code}) ` ,
                children:children , 
                icon: children?'jstree-folder':'jstree-file',
                a_attr:{code:code}});
  }

  
  historyNodeInfo[parentId] = data;

  fs.writeFile(JSTREE_NODE_JSONFILE, JSON.stringify(historyNodeInfo), 'utf8', function (err) { 
    if (err) { 
        console.log("An error occured while writing JSON Object to File."); 
        return console.log(err); 
    } 
    res.json(data);
 });

});





module.exports = router;
