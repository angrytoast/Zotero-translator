{
        "translatorID": "2158b838-f982-4f32-8744-69b19c7e75fd",
        "label": "Mother Jones",
        "creator": "Gary Gao",
        "target": "http://(www\\.)?motherjones.com",
        "minVersion": "1.0",
        "maxVersion": "",
        "priority": 100,
        "inRepository": "0",
        "translatorType": 4,
        "lastUpdated": "2011-06-04 16:08:12"
}

/*
motherjones.com site translator
Copyright (C) 2011 Gary Gao, angrytoast@gmail.com

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/


function detectWeb(doc, url) {
	url = doc.location.href;
	//determine if page is a blogPost or Article via the meta tag <meta property="og:type" content="article>
	var isArticle = false;
	var m = doc.getElementsByTagName("meta");
	for (var i = 0; i < m.length; i++) {
		if ( m[i].getAttribute("content")  == "article") isArticle = true;
	}
		
	if (url.indexOf("\/search\/") != -1) {
		return "multi";
	} else if (url.indexOf("\/print\/") != -1 ) {
		return "print";	
	} else if (isArticle) { //3 types of articles: blogPost, photoessay and article, with varying structures
		if ( doc.getElementById("blog-nav-container") ) {
			return "blog";
		} else if (url.indexOf("\/photoessays") != -1){
			return "photoessay";
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
		
		var type = detectWeb(doc, url);
	
		//articles , blog posts, photo essays contain title and description in <meta> tags
		var metaArr = new Object();
		var metaTags = doc.getElementsByTagName("meta")
		for (var i = 0 ; i < metaTags.length ; i++) {
	    		metaArr[metaTags[i].getAttribute("property")] = metaTags[i].getAttribute("content");
		}
		
		if (type == "article" || type =="photoessay" ) {
			var newItem = new Zotero.Item("magazineArticle");
			newItem.title = metaArr["og:title"];
			newItem.abstractNote = metaArr["og:description"]
		} else if (type == "print") { //print page uses differnent doc structure than regular page
			var newItem = new Zotero.Item("magazineArticle");
			newItem.title = doc.getElementsByClassName('print-title')[0].textContent;
			newItem.abstactNote = doc.getElementsByClassName('dek')[0].textContent;
		} else if (type == "blog") { //blog pages are slightly different from article pages
			var newItem = new Zotero.Item("blogPost");
			newItem.title = Zotero.Utilities.trim(doc.getElementById("content-header").textContent);
		}
		
		newItem.ISSN = "0362-8841";
		newItem.url = doc.location.href;
		newItem.publicationTitle = "Mother Jones";
		newItem.shortTitle = "MoJo";

		//Mother Jones only appears to have single author articles
		if ( type == "article" || type == "blog"){ //standard web views
			var author = doc.evaluate('//p[contains(@class, "byline")]/a', doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext();	
			var date = doc.getElementById("dateline").textContent.replace(/\| ?/,""); //replace to account for blog post date string
		} else if ( type == "print" ) {
			var author = doc.evaluate('//span[contains(@class, "byline")]/a', doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext();
			var date = doc.getElementsByClassName('dateline')[0].textContent;
		} else {
			var author = doc.evaluate('//p[contains(@class, "byline")]/a', doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext();	
		}
		
		newItem.creators.push(Zotero.Utilities.cleanAuthor(author.textContent, "author"));
		
		if (type != "photoessay"){ //photoessay pages lack dates, for some reason
			date = date.split(" ");
			newItem.date = date[1].replace(/\./i," ") + date[2]+ " " + date[3];
		}
		
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
	} else if (detectWeb(doc, url) != null ) {
		scrape(doc);
	}
}