var ELIDED_TERM = '<elided_term>';

function generateRows(ref){
  if(ref && (ref.indexOf('http:')===0 || ref.indexOf('https:')===0)){
    var text = UrlFetchApp.fetch(ref).getContentText();
    
    return Utilities.parseCsv(text);
    
  } else if(ref && ref.indexOf('gs:')===0 ) {
    // gs: means 'google spreadsheet' -- get rows from a
    // remote spreadsheet, by spreadsheet id. 
    
    // The url format is: gs:<docid>#<sheetname>
    
    // Split URL into dockId and sheetName
    
    var docId = null;
    var sheetName = null;
    
    return SpreadsheetApp.openById(docId) 
    .getSheetByName(sheetName)
    .getDataRange()
    .getValues();
    
  } else  {
    // Get rows from the local spreadsheet
    return _getMetaSheet().getDataRange().getValues();
   
  }

}


var normalizeTerm = function(term) {
  var parts = splitTermLower(term);
  return parts[0] + '.' + parts[1];
}

var splitTerm = function(term) {
  
  var parentTerm;
  var recordTerm;
  
  if (term.indexOf(".") >= 0) {
    var parts = term.split(".");
    parentTerm = parts[0].trim();
    recordTerm = parts[1].trim();
    
    if (parentTerm == '') {
      parentTerm = ELIDED_TERM;
    }
    
  }
  else {
    parentTerm = 'root';
    recordTerm = term.trim()
    
  }
  
  return [parentTerm, recordTerm];
};

var splitTermLower = function(term) {
  var terms = splitTerm(term);
  return [terms[0].toLowerCase(), terms[1].toLowerCase()];
};

var Term = function(term, value, termArgs, rowN, colN, fileName) {
  this.term = term;
  this.row = rowN;
  this.col = colN;
  this.fileName = fileName;
  
  this.value = value && String(value).trim();
  
  var p = splitTermLower(this.term);
  this.parentTerm = p[0];
  this.recordTerm = p[1];
  
  if (Array.isArray(termArgs)) {
    this.termArgs = []
    var valid_vals = 0
    for (var i = 0; i < termArgs.length; i++) {
      if (termArgs[i].trim()) {
        valid_vals++;
      }
      this.termArgs.push(termArgs[i].trim());
    }
    
    if (valid_vals == 0) {
      this.termArgs = [];
    }
    
  }
  else {
    this.termArgs = [];
  }
  
  this.children = [];
  
  this.section = null;
  
  this.termValueName = '@value';
  
  this.childPropertyType = 'any';
  this.valid = Boolean(term) && Boolean(this.recordTerm);
  
  this.isArgChild = false;
  this.wasElided = (this.parentTerm == ELIDED_TERM);
  
  this.canBeParent = function(){ 
    return (!this.isArgChild && !this.wasElided);
  }
  
  this.toString = function() {
    
    var fn;
    if (this.fileName) {
      var fileParts = this.fileName.split("/");
      fn = fileParts.pop();
    }
    else {
      fn = '<null>';
    }
    
    return "<Term " + fn + " " + this.row + ":" + this.col + " " +
      this.parentTerm + "." + this.recordTerm + "=" +
        this.value + " " + JSON.stringify(this.termArgs) +
          " >";
  }
  
  this.clone = function() {
    
    var c = new Term(this.term, this.value, this.termArgs);
    c.parentTerm = this.parentTerm;
    c.recordTerm = this.recordTerm;
    c.children = this.children;
    c.section = this.cection;
    c.filename = this.filename;
    c.row = this.row;
    c.col = this.col;
    c.termValueName = this.termValueName;
    c.childPropertyType = this.childPropertyType;
    c.valid = this.valid;
    c.isArgChild = this.isArgChild;
    c.wasElided = this.wasElided;
    
    return c;
    
  }
  
  this.joinedTerm = function() {
    return this.parentTerm + '.' + this.recordTerm;
  }
  
  this.joinedTermLc = function() {
    return this.parentTerm.toLowerCase() + '.' +
      this.recordTerm.toLowerCase();
  }
  
  this.termIs = function(v) {
    if (this.recordTerm.toLowerCase() == v.toLowerCase() ||
      this.joinedTermLc() == v.toLowerCase() ||
        this.recordTerm.toLowerCase().indexOf('.' + v.toLowerCase()) > -1
        ) {
          return true;
        }
    else {
      return false;
    }
  }
  
  // Return child terms created from the row args. 
  this.argChildren = function() {
    
    if (this.termIs('section')) {
      return [];
    }
    
    var childTerms = [];
    
    for (var j = 0; j < this.termArgs.length; j++) {
      
      var t =  new Term(this.recordTerm.toLowerCase() + "." + String(j),
          String(this.termArgs[j]), [], i, j + 2, this.fileName);
      
      t.isArgChild = true;
      childTerms.push(t);
      
    }
    
    return childTerms;
  }
};

var generateTerms = function(path, cb) {
  
  
  if (!cb) {
    cb = function(term) {
      terms.push(term);
    }
  }
  
  var terms = [];
  var rows = generateRows(path);
  var i = 0;
  
  for (var i = 0; i < rows.length; i++) {
    
    var row = rows[i];
    
    var term = new Term(row[0], row[1], row.slice(2), i+1, 1, path);
    
    if (term.valid) {
      
      cb(term);
      
      var ac = term.argChildren();
      
      for (var j = 0; j < ac.length; j++) {
        var child = ac[j];
        if (child.valid && child.value) {
          cb(child);
        }
      }
      
      if (term.termIs('include')) {
        var gt = generateTerms(term.value)
        for (var j = 0; j < gt.length; j++ ) {
          includedTerm = gt[j];
          cb(includedTerm);
          
        }
      }
    }
  }
  
  return terms;
  
}

var TermInterpreter = function(path) {
  
  this.terms = {}; // Terms info from a declare doc
  this.sections = {}; // sections info from a declare doc
  this.errors = []; // Parse errors. 
  this.path = path; //  Filesystem path or URL to document
  this.declareDocs = [] // Dict tress loaded to importDeclareDoc
  this.rootTerm = null; // The Root terms, top of the link terms heirarchy
  this.parsedTerms = []; // All of the parsed terms, as an array or arrays. 
  
  
  this.substituteSynonym = function(nt) {
    var jtlc = nt.joinedTermLc();
    
    if ( jtlc in this.terms && 'synonym' in this.terms[jtlc]){
      
      var syn = this.terms[jtlc]['synonym'];
      var parts = splitTermLower(syn);
      
      nt.parentTerm = parts[0];
      nt.recordTerm = parts[1];
    }
    
  };
  
  this.join = function(t1, t2) {
    return t1 + '.' + t2
  }
  
  this.installDeclareTerms = function() {
    
    this.terms['root.section'] = {
      'termvaluename': 'name'
    };
    this.terms['root.synonym'] = {
      'termvaluename': 'term_name',
      'childpropertytype': 'sequence'
    };
    this.terms['root.declareterm'] = {
      'termvaluename': 'term_name',
      'childpropertytype': 'sequence'
    };
    this.terms['root.declaresection'] = {
      'termvaluename': 'section_name',
      'childpropertytype': 'sequence'
    };
    this.terms['root.declarevalueset'] = {
      'termvaluename': 'name',
      'childpropertytype': 'sequence'
    };
    this.terms['declarevalueset.value'] = {
      'termvaluename': 'value',
      'childpropertytype': 'sequence'
    };
    
  }
  
  this.run = function() {
    
    var self = this;
    
    var lastParentTerm = 'root';
    var paramMap = [];
    self.rootTerm = null;
    
    var lastTermMap = {};
    var lastSection = null;
    var terms = [];
    
    var gt = generateTerms(this.path);
    
    for (var k = 0; k < gt.length; k++ ) {
      var term = gt[k];
      if (!self.rootTerm) {
        self.rootTerm = new Term('Root', null);
        self.rootTerm.row = 0;
        self.rootTerm.col = 0;
        self.rootTerm.file_name = term.file_name;
        lastTermMap[ELIDED_TERM] = self.rootTerm;
        lastTermMap[self.rootTerm.recordTerm] =  self.rootTerm;
        
        terms.push(self.rootTerm);
        
      }
      
      var nt = term.clone();
      
      
      nt.fileName = self.path;
      
      if (nt.parentTerm == ELIDED_TERM) {
        // If the parent term was elided -- the term starts with '.'
        // then substitute in the last parent term
        nt.wasElided == true; // probably should already be set
        nt.parentTerm = lastParentTerm;
      }
      
      self.substituteSynonym(nt);
      
      if (parseInt(term.recordTerm) in paramMap) {
        // Convert child terms from the args, which are initially 
        // given recordTerm names of integers, according to their 
        // position in the arg list. 
        
        nt.recordTerm = String(paramMap[parseInt(term.recordTerm)]) || nt.recordTerm;
        
      }
      
      if (nt.termIs('root.section')) {
        // Section terms set the param map
        paramMap = [];
        for (var i = 0; i < nt.termArgs.length; i++) {
          paramMap[i] = String(nt.termArgs[i]).toLowerCase();
        }
        lastParentTerm = self.rootTerm.recordTerm
        lastSection = nt;
        continue;
      }
      
      if (nt.termIs('declare')) {
        var path;
        
        if (nt.value.indexOf('http') === 0) {
          path = nt.value.replace(/\/$/, "");
        }
        else {
          path = dirname(nt.fileName) + "/" +
            nt.value.replace(/\/$/, "");
        }
        
        var dci = new TermInterpreter(path);
        dci.installDeclareTerms();
        
        var declareTerms = dci.run();
        
        this.importDeclareDoc(dci.toDict());
        
        
      }
      
      if (nt.joinedTerm() in self.terms) {
        
        var tInfo = self.terms[nt.joinedTerm()];
        nt.childPropertyType = tInfo['childpropertytype'] || 'any';
        nt.termValueName = tInfo['termvaluename'] || '@value';
      }
      
      nt.valid = nt.joinedTermLc() in self.terms;
      nt.section = lastSection;
      
      if (nt.canBeParent()) {
        lastParentTerm = nt.recordTerm;
        lastTermMap[ELIDED_TERM]=nt;
        lastTermMap[nt.recordTerm]=nt;
      }
      
      var parent = lastTermMap[nt.parentTerm];
      if (parent) {
        parent.children.push(nt);
      } else {
        // This probably can't happen. And, if it can, it may be
        // sensible to make the parent the root. 
        throw "Could not find parent for " + nt.toString();
      }
      
      terms.push(nt); // Probably useless, if Root links to everything. 
      
      
    }
    
    this.parsedTerms.push(terms);
    
    return this;
    
  };
  
  
  this.toDict = function(term) {
    
    function is_scalar(obj) {
      return (/string|number|boolean/).test(typeof obj);
      
    };
    
    function is_array(obj) {
      return (Object.prototype.toString.call(obj) === '[object Array]');
    }
    
    function _toDict(term){
      if (term.children.length) {
        
        var d = {};
        
        for (var i = 0; i < term.children.length; i++) {
          var c = term.children[i];
          if (c.childPropertyType == 'scalar') {
            d[c.recordTerm] = _toDict(c);
            
          }
          else if (c.childPropertyType == 'sequence') {
            if (c.recordTerm in d) {
              d[c.recordTerm].push(_toDict(c));
            }
            else {
              // The c.term property doesn't exist, so add a list
              d[c.recordTerm] = [_toDict(c)];
            }
            
          }
          else {
            
            if (c.recordTerm in d) {
              if (!is_array(d[c.recordTerm])) {
                //The entry exists, but is a scalar, so convert it to a list
                d[c.recordTerm] = [d[c.recordTerm]];
              }
              
              d[c.recordTerm].push(_toDict(c));
            }
            else {
              // Doesn't exist, so add as a scalar
              d[c.recordTerm] = _toDict(c);
            }
          }
        }
        
        
        
        if (term.value) {
          d[term.termValueName] = term.value;
        }
        
        return d;
        
      }
      else {
        return term.value;
      }
    }
    
    return _toDict(this.rootTerm);
    
  };
  
  this.importDeclareDoc = function(d) {
    
    this.declareDocs.push(d);
    
    if ('declaresection' in d) {
      for (var i = 0; i < d['declaresection'].length; i++) {
        var e = d['declaresection'][i]
        if (e) {
          
          var args = [];
          
          for (var k in e) {
            if (e.hasOwnProperty(k)) {
              var ki = parseInt(k);
              if (typeof ki == 'number') {
                args[k] = e[k] || null;
              }
            }
          }
          this.sections[e['section_name'].toLowerCase()] = {
            'args': args,
            'terms': []
          };
        }
      }
    }
    
    if ('declareterm' in d) {
      for (var i = 0; i < d['declareterm'].length; i++) {
        var e = d['declareterm'][i];
        if (e) {
          this.terms[normalizeTerm(e['term_name'])] = e;
          var sk = e['section'].toLowerCase();
          
          if ('section' in e && e['section'] && !(sk in this.sections)) {
            this.sections[sk] = {
              'args': [],
              'terms': []
            };
          }
          
          var st = this.sections[sk]['terms'];
          
          if (!(e['section'] in st)) {
            st.push(e['term_name']);
          }
        }
      }
    }
    
    if ('declarevalueset' in d) {
      for (var i = 0; i < d['declarevalueset'].length; i++) {
        var e = d['declarevalueset'][i]
        for (var termName in this.terms) {
          if (this.terms.hasOwnProperty(termName) &&
              'valueset' in this.terms[termName] &&
              e['name'] && e['name'] == this.terms[termName]['valueset']) {
            this.terms[termName]['valueset'] = e['value']
          }
        }
      }
    }
    
    
  };
};


function parseMetatab(ref){
  
  if (true){
    
    var interp = new TermInterpreter(ref);
  
    interp.run();
    
    return interp;
    
  } else {
    // Older method using remote parsing server
    const values = _getMetaSheet().getDataRange().getValues();
    
    parserUrl = PropertiesService.getScriptProperties().getProperty('parser.url')
    
    var options =
        {
          'method' : 'post',
          'contentType': 'application/json',
          'payload' : JSON.stringify(values)
        };
    
    return UrlFetchApp.fetch(parserUrl, options).getContentText(); 
  }
 
}

/*
* Like parseMetatab(), but also caches the result. The cache is clear on
* any change to the Meta tab. 
*/
function parseMetatabToDict(ref){
  
  if(typeof ref == 'undefined'){
    ref = metaSheetName
  }
  
  const cache = CacheService.getDocumentCache();
  
  const cacheKey = 'mp-'+ref
  
  var doc = null; //cache.get(cacheKey);
  
  if (!doc){
    var doc = parseMetatab(ref).toDict();
    cache.put(cacheKey, doc, 1200);
    
  }
  
  return doc; 
}
  


