{
        "translatorID": "9b0d0f84-8073-4af4-bb4b-17564df00b61",
        "label": "Mother Jones",
        "creator": "Gary Gao",
        "target": "^http://(www\\.)?motherjones",
        "minVersion": "1.0",
        "maxVersion": "",
        "priority": 100,
        "inRepository": "0",
        "translatorType": 4,
        "lastUpdated": "2011-06-01 15:34:26"
}


function detectWeb(doc, url) {
	url = doc.location.href;
	if (url.indexOf("\/search\/") != -1) {
		return "multi";
	} else if (url.indexOf("print\/") != -1 ) {
		return "print";	
	} else if (url.indexOf("motherjones\.com\/about") == -1 && url.indexOf("\/photoessays") == -1 ) {	
		if ( doc.getElementById("blog-nav-container") ) {
			return "blog";
		} else {	
			return "article";
		}
	}
}

function scrape(doc, url) {
		var namespace = doc.documentElement.namespaceURI;
		var nsResolver = namespace ? function(prefix) {
			if (prefix == 'x') return namespace; else return null;
		} : null;
	
		var metaArr = new Object();
		var metaTags = doc.getElementsByTagName("meta")
		for (var i = 0 ; i < metaTags.length ; i++) {
	    		metaArr[metaTags[i].getAttribute("property")] = metaTags[i].getAttribute("content");
		}
		
		if (detectWeb(doc, url) == "article") {
			var newItem = new Zotero.Item("magazineArticle");
			newItem.title = metaArr["og:title"];
			newItem.abstractNote = metaArr["og:description"]
		} else if (detectWeb(doc, url) == "print") {
			var newItem = new Zotero.Item("magazineArticle");
			newItem.title = doc.getElementsByClassName('print-title')[0].textContent;
			newItem.abstactNote = doc.getElementsByClassName('dek')[0].textContent;
		} else if (detectWeb(doc, url) == "blog") {
			var newItem = new Zotero.Item("blogPost");
			newItem.title = Zotero.Utilities.trim(doc.getElementById("content-header").textContent);
		}
		
		newItem.ISSN = "0362-8841";
		newItem.url = doc.location.href;
		newItem.publicationTitle = "Mother Jones";
		newItem.shortTitle = "MoJo";

		//Mother Jones only appears to have single author articles
		if (detectWeb(doc, url) == "article" || detectWeb(doc, url) == "blog"){ //standard web views
			var author = doc.evaluate('//p[contains(@class, "byline")]/a', doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext();	
			var date = doc.getElementById("dateline").textContent.replace(/\| ?/,""); //replace to account for blog post date string
		} else { //print ver
			var author = doc.evaluate('//span[contains(@class, "byline")]/a', doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext();
			var date = doc.getElementsByClassName('dateline')[0].textContent;			
		}
		
		newItem.creators.push(Zotero.Utilities.cleanAuthor(author.textContent, "author"));
		
		date = date.split(" ");
		newItem.date = date[1].replace(/\./i," ") + date[2]+ " " + date[3];
		
		//tag via primary article terms if present
		if(doc.getElementById("primary-terms")) {
			var keywords = doc.getElementById("primary-terms").textContent;
			newItem.tags = keywords.toLowerCase().replace(/^.{2}/gi, "").split(", ");
		}

		newItem.attachments.push({document:doc, title:doc.title});
		newItem.complete();
}

function doWeb (doc, url) {
	var namespace = doc.documentElement.namespaceURI;
	var nsResolver = namespace ? function(prefix) {
		if (prefix == 'x') return namespace; else return null;
	} : null;
	var isArticle = false;
	
	var m = doc.getElementsByTagName("meta");
	for (var i = 0; i < m.length; i++) {
		var a = m[i].getAttribute("content");
		if ( a == "article") isArticle = true;
	}
	
	if (detectWeb(doc, url) == "multi") {
		var articles = new Array(),
		items = new Object(),
		nextTitle,
		myXPath = "//dl[contains(@class, 'search-results')]/dt/a"
		titles = doc.evaluate(myXPath, doc, nsResolver, XPathResult.ANY_TYPE, null);
	
		while (nextTitle = titles.iterateNext()) {
			items[nextTitle.href] = nextTitle.textContent;
		}
		
		items = Zotero.selectItems(items);
		for (var i in items) {
			articles.push(i);
		}

	Zotero.Utilities.processDocuments(articles, scrape, function(){Zotero.done();});
	Zotero.wait();
 
	} else if (isArticle) {
		scrape(doc);
	}
}