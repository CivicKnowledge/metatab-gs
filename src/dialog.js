
function showJSON() {
  
  var html = HtmlService.createTemplateFromFile('json')
      .evaluate()
      .setWidth(600)
      .setHeight(600);
  
  SpreadsheetApp.getUi().showModalDialog(html, 'JSON');
}

function openDialog() {
  var html = HtmlService.createHtmlOutputFromFile('Index');
  SpreadsheetApp.getUi() // Or DocumentApp or FormApp.
      .showModalDialog(html, 'Dialog title');
}
