var fs = require("fs")
var path = require('path')
var child_process = require('child_process');
 
function walk(dir) {
    var children = []
    fs.readdirSync(dir).forEach(function(filename){
        var path = dir+"/"+filename
        var stat = fs.statSync(path)
        if (stat && stat.isDirectory()) {
            children = children.concat(walk(path))
        }
        else {
            children.push(path)
        }
    })
 
    return children
}
var input_dir = process.argv[1];
var root_dir = 'D:/peng.zhao/workspace/重要/5G_MODEM_V2_TRUNK_W21.30.4/MS_Code/PS';

if(null != input_dir && 'undefined' !== typeof input_dir && input_dir.trim()!='')
{
	root_dir = input_dir;
	
}
console('root dir is ' + root_dir);

const excluedExts=['c', 'cats', 'ec', 'idc', 'pgc' ,  // C
						  'C' , 'c++', 'cc' , 'CPP' ,  'cpp' ,  'cxx' , 'h++' ,  'inl' ,  'ipp' ,  'pcc' ,  'tcc' ,  'tpp' , // C++
						  'H' , 'h', 'hh' , 'hpp' , 'hxx'
						  ];
						  
var excludes = [];
var files = walk(root_dir);

						  
files = files.filter(item =>{
	var relativePath = item.replace(root_dir+'/',  '' );
	var bMatch = false;
	var ext = path.extname(item);
	ext = ext.trim().toLowerCase();
	for(let i = 0 ; i < excluedExts.length ; i++)
	{
		var excluedExt = excluedExts[i];
		excluedExt = '.' + excluedExt.trim().toLowerCase();
		if(ext == excluedExt)
		{
			bMatch = true;
			break;
		}
		
	}
	
	if(!bMatch)
	{
		excludes.push(relativePath);
	}
	return bMatch;
});

console.dir(files);
var result = [];
var count = 0;
files.forEach(item=>{
	count ++;
	var relativePath = item.replace(root_dir+'/',  '' );
	var ret = child_process.execSync(`cloc --json   --include-lang="C++","C","C/C++ Header" "${item}"`).toString();
		
	if(null != ret && 'undefined' !== typeof ret && ret.trim()!='')
	{
		try{
			var cloc = JSON.parse(ret);
			var code = 0;
			for (let key in cloc) {
				if( ('C++' == key) || ('C' == key) || ('C/C++ Header' == key))
				{
					code +=cloc[key].code;
				}
			}
			
			if(code > 0)
			{
				
				result.push({name: relativePath, code:code});
				process.stdout.clearLine();
				process.stdout.write(`${count}/${files.length}:${code} lines at ${relativePath}\r`);
			}
			
			
		}catch(e)
		{
			console.log(e);
		}
	}
});
process.stdout.clearLine();

fs.writeFile("output.json", JSON.stringify({root:root_dir , result:result , excludes:excludes}), 'utf8', function (err) { 
    if (err) { 
        console.log("An error occured while writing JSON Object to File."); 
        return console.log(err); 
    } 
    console.log("JSON file has been saved."); 
 });