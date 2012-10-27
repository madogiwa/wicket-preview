/*
 * wicket-preview.js
 *
 * Copyright (c) 2012 Hidenori Sugiyama
 */

var wicketPreview = (typeof wicketPreview === "undefined") ? {} : wicketPreview;
wicketPreview.suffix = wicketPreview.suffix || ".html";
wicketPreview.pageHeaderContribution = wicketPreview.pageHeaderContribution || false;

(function(wicketPreview){
  window.onload = function() {
    if (window.jQuery) {
      process();
    } else {
      loadLibrary();
    }
  };

  function loadLibrary() {
    var script = document.createElement("script");
    script.src = "https://ajax.googleapis.com/ajax/libs/jquery/1.8.2/jquery.min.js";
    script.onload = function(){
      process();
    };
    document.getElementsByTagName("head")[0].appendChild(script);
  };

  function process() {
    var parentName = getParentName($('html'));
    if (parentName) {
      redirectToParent(parentName);
    }

    var node = $('html');
    showComponents(node);

    var children = getChildren();
    loadChildren(node, children);
  };

  function redirectToParent(parentName) {
    var url = encodeURIComponent(location.href);
    var parentUrl = parentName + wicketPreview.suffix;
    location.href = parentUrl + '?child=' + url;
  };

  function getParentName(node) {
    var extend = $('wicket\\:extend[data-parent]', node);
    if (extend.length != 1) {
      return null;
    }
    return extend.data('parent');
  };

  function getChildren() {
    var children = [];

    var search = location.search;
    while(true) {
      var params = getParameters(search);
      if (typeof params['child'] == "undefined") {
        break;
      }

      children.push(params['child']);
      search = params['child'];
    }

    return children;
  };

  function getParameters(search) {
    var params = [];

    var pairs = search.slice(search.indexOf("?")+1).split("&");
    for(var i = 0; i < pairs.length; i++) {
      var pair = pairs[i].split('=');
      params[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1]);
    }

    return params;
  };

  function headerContributionForPage(html) {
    if (!wicketPreview.pageHeaderContribution) {
      headerContributionForPanel(html);
      return;
    }

    var begin = html.indexOf('<head>');
    var end = html.indexOf('</head>');

    if (begin == -1 || end == -1) {
      return;
    }

    var head = html.slice(begin + '<head>'.length, end);
    $('head').append(head);
  };

  function headerContributionForPanel(html) {
    var begin = html.indexOf('<wicket:head>');
    var end = html.indexOf('</wicket:head>');

    if (begin == -1 || end == -1) {
      return;
    }

    var head = html.slice(begin + '<wicket:head>'.length, end);
    $('head').append(head);
  };

  function loadChildren(node, children) {
    var child = children.shift();
    if (child) {
      loadChild(node, child, children);
    }
  };

  function loadChild(node, url, children) {
    node.find('wicket\\:child').load(url + ' wicket\\:extend', function(response, status, xhr){
      headerContributionForPage(response);
      showComponents($(this));
      loadChildren($(this), children);
    });
  }

  function showComponents(node) {
    showFragments(node);
    showList(node);
    showPanels(node);
  };

  function showPanels(node) {
    node.find('[wicket\\:id][data-panel]').each(function(response, status, xhr){
      var panel = $(this).data('panel');
      resolvePanel(this, panel + wicketPreview.suffix, []);
    });
  }

  function resolvePanel(node, url, paths) {
    $(node).load(url + " wicket\\:extend", function(response, status, xhr){
      if (response.indexOf('<wicket:extend') > 0) {
        paths.push(url);
        resolvePanel(node, getParentName(node) + wicketPreview.suffix, paths);
      } else {
        loadPanel(node, url, paths);
      }
    });
  };

  function loadPanel(node, url, paths) {
    $(node).load(url + " wicket\\:panel", function(response, status, xhr){
      headerContributionForPanel(response);
      showComponents($(this));

      var child = paths.shift();
      if (child) {
        loadChildPanel($('wicket\\:child', node), child, paths);
      }
    });
  };

  function loadChildPanel(node, url, paths) {
    $(node).load(url + " wicket\\:extend", function(response, status, xhr){
      headerContributionForPanel(response);
      showComponents($(this));

      var child = paths.shift();
      if (child) {
        loadPanel($('wicket\\:child', node), child, paths);
      }
    });
  };

  function showFragments(node) {
    var fragments = {};
    $('wicket\\:fragment', node).each(function(){
      var id = this.getAttribute('wicket:id');
      fragments[id] = this;
    });

    $('[data-fragment]', node).each(function(){
      var fragment = $(this).data('fragment');
      $(this).append($(fragments[fragment]).clone());
    });

    for(key in fragments) {
      $(fragments[key]).hide();
    }
  };

  function showList(node) {
    $('[wicket\\:id][data-repeat]', node).each(function(){
      var repeat = $(this).data('repeat');
      for(var i = 0; i < repeat; i++) {
        $(this).after($(this).clone());
      }
      $(this).hide();
    });
  };

})(wicketPreview);

