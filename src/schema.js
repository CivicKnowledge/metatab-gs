function isInt(v){
  return parseInt(v) == v;
}

function isFloat(v){
  return parseFloat(v) == v;
}
  
function getDataType(v){
  if (isInt(v)){
    return 'int';
  } else if (isFloat(v)){
    return 'float';
  } else {
    return 'string';
  }
}

function createSchema(){
  
  const excludeTabs = [ metaSheetName, schemaSheetName, 'Old '+metaSheetName]
  
  const sheets = SpreadsheetApp.getActiveSpreadsheet().getSheets();
  
  for (var i = 0; i < sheets.length ; i++ ) {
    var sheet = sheets[i];
    if (excludeTabs.indexOf(sheet.getName()) >= 0){
      Logger.log("Excluded %s", sheet.getName());
      continue;
    }

    const header = sheet.getRange('1:1').getValues()[0];
    
    Logger.log(header);
    
    for (var i =0; i < header.length; i++){
      Logger.log(header[i]);
    }
    
  }
}