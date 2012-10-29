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
    var loaded = false;
    script.onload = function(){
      if (!loaded) {
        loaded = true;
        process();
      }
    };
    script.onreadystatechange = function(){
      if (!loaded && (this.readyState == "loaded" || this.readyState == "complete")) {
        loaded = true;
        process();
      }
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
    if (extend.length == 1) {
      return extend.data('parent');
    }

    var extendForIE = document.getElementsByTagName('wicket:extend');
    for(var i = 0; i < extendForIE.length; i++) {
      if (isDescendantNode(extendForIE[i], $(node).get(0))) {
        return extendForIE[i].getAttribute('data-parent');
      }
    }

    // for IE7
    var extendForIE7 = document.getElementsByTagName('extend');
    for(var i = 0; i < extendForIE7.length; i++) {
      if (isDescendantNode(extendForIE7[i], $(node).get(0))) {
        return extendForIE7[i].getAttribute('data-parent');
      }
    }


    return null;
  };

  function isDescendantNode(node, parentNode) {
    var current = node;
    while(current) {
      if (current == parentNode) {
        return true;
      }
      current = current.parentNode;
    }
    return false; 
  };

  function getChildNode(node) {
    var child = $(node).find('wicket\\:child');
    if (child.length == 1) {
      return child;
    }

    var childForIE = document.getElementsByTagName('wicket:child');
    for(var i = 0; i < childForIE.length; i++) {
      if (isDescendantNode(childForIE[i], $(node).get(0))) {
        return childForIE[i];
      }
    }

    // for IE7
    var childForIE7 = document.getElementsByTagName('child');
    for(var i = 0; i < childForIE7.length; i++) {
      if (isDescendantNode(childForIE7[i], $(node).get(0))) {
        return childForIE7[i];
      }
    }

    return null;
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
      loadChild(getChildNode(node), child, children);
    }
  };

  function loadChild(node, url, children) {
    var target = fixElementBugForIE(node);
    $(target).load(url + ' wicket\\:extend', function(response, status, xhr){
      var root = fixLoadBugForIE7(target, response, 'wicket:extend') || this;

      headerContributionForPage(response);
      showComponents($(root));
      loadChildren($(root), children);
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
    var target = fixElementBugForIE(node);
    $(target).load(url + " wicket\\:extend", function(response, status, xhr){
      var root = fixLoadBugForIE7(target, response, 'wicket:extend') || this;

      if (response.indexOf('<wicket:extend') > 0) {
        paths.push(url);
        var parentName = getParentName(root);
        resolvePanel(target, getParentName(root) + wicketPreview.suffix, paths);
      } else {
        loadPanel(target, url, paths);
      }
    });
  };

  function loadPanel(node, url, paths) {
    var target = fixElementBugForIE(node);
    $(target).load(url + " wicket\\:panel", function(response, status, xhr){
      var root = fixLoadBugForIE7(target, response, 'wicket:panel') || this;

      headerContributionForPanel(response);
      showComponents($(root));

      var child = paths.shift();
      if (child) {
        loadChildPanel(getChildNode(root), child, paths);
      }
    });
  };

  function loadChildPanel(node, url, paths) {
    var target = fixElementBugForIE(node);
    $(target).load(url + " wicket\\:extend", function(response, status, xhr){
      var root = fixLoadBugForIE7(target, response, 'wicket:extend') || this;

      headerContributionForPanel(response);
      showComponents($(root));

      var child = paths.shift();
      if (child) {
        loadChildPanel(getChildNode(root), child, paths);
      }
    });
  };

  function showFragments(node) {
    var fragments = {};
    $('wicket\\:fragment', node).each(function(){
      var id = this.getAttribute('wicket:id');
      fragments[id] = this;
    });

    // for IE7
    if (!$.support.tbody) {
      var tags = document.getElementsByTagName('fragment');
      for(var i = 0; i < tags.length; i++) {
        var id = tags[i].getAttribute('wicket:id');
        fragments[id] = tags[i];
      }
    }

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

  function fixElementBugForIE(node) {
    // for IE7
    if (!$.support.tbody) {
      var divIE7 = $('<span>');
      $(divIE7).insertAfter(node);

      // copy data-panel attribute only
      $(divIE7).attr('data-panel', $(node).attr('data-panel'));

      $(node).remove();
      return divIE7;
    }

    // for IE8 & UknownElement(i.e. <wicket:container>)
    if (node instanceof HTMLUnknownElement && !$.support.leadingWhitespace) {
      var divIE8 = $('<div>');
      $(divIE8).insertAfter(node);

      // copy all attribute
      $.each($(node).prop('attributes'), function(){
        $(divIE8).attr(this.name, this.value);
      });

      $(node).remove();
      return divIE8;
    }

    return node;
  };

  function fixLoadBugForIE7(target, response, tag) {
    // not IE7
    if ($.support.tbody) {
      return;
    }

    var beginTag = '<' + tag;
    var endTag = '</' + tag + '>';

    var begin = response.indexOf(beginTag);
    var end = response.indexOf(endTag);

    var html = response.slice(begin, end + endTag.length);
    $(target).html(html);
    return $(target).children().get(0);
  };

})(wicketPreview);

