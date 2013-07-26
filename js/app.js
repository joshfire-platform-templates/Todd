// TODO check if Joshfire.factory.config.datasources.main > 0
var factory = Joshfire.factory,
    app = factory.config.app,
    dataSources = (factory.getDataSource( "main" ) ? factory.getDataSource( "main" ).children : null),
    template = factory.config.template,
    device = factory.device,
    firstLaunch = true,
    photoSwipeInstance;


if (app.icon) {
  var link = document.createElement("link");
  link.rel = "apple-touch-icon";
  link.href = app.icon.contentURL;
  document.head.appendChild(link);
}

// Prevent letterbox when adding this app to iPhone 5 home screen
// See http://www.mobilexweb.com/blog/iphone-5-ios-6-html5-developers
if (window.screen.height === 568) { // iPhone 4"
  document.querySelector("meta[name=viewport]").content = "width=320.1";
}

document.title = app.name;

function extractTime( date ) {
  var currentDate = new Date( date );
  var hours = currentDate.getHours();
  var minutes = currentDate.getMinutes();

  if (minutes < 10) {
    minutes = "0" + minutes;
  }

  if ( hours > 11 ) {
    return hours + ":" + minutes + "PM";
  } else {
    return hours + ":" + minutes + "AM";
  }
}

function extractDay( date ) {
  var currentDate = new Date( date );
  var monthNames = [ "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December" ];
  var dayNames = [ "Monday", "Tuesday", "Wednesday", "Thuesday", "Friday", "Saturday", "Sunday" ];

  return dayNames[currentDate.getDay()] + "," + monthNames[currentDate.getMonth()] + " " + currentDate.getDate() + ", " + currentDate.getFullYear();
}

function find (dataSourceId, opt, cb) {
  var skip    = opt.skip || 0;
  var limit   = opt.limit || 20;

  try {
    // Get the items from our dataSource
    dataSources[ dataSourceId ].find( {
      skip  : skip,
      limit : limit
    }, function ( err, data ) {
      cb(err, data);
    });
  } catch (e) {
    throw new Error('No datasource matching ID "' + dataSourceId + '"');
  }
};

function getListItemsMarkup(dataSourceId, data) {

  var itemsMarkup = '';
  var previousDate = null;
  var outputType = dataSources[ dataSourceId ].config.outputType;

  if (!data || !data.entries || !data.entries.length) throw new Error ('No data received');

  // Generate a list item for each item in the category and add it to our markup.
  for ( var i = 0; i < data.entries.length; i++ ) {

    // Our item need to be extended to transmit useful information to the template
    data.entries[ i ].i = i;
    data.entries[ i ].dataSourceId = dataSourceId;

    var extractedDay = extractDay( data.entries[ i ].datePublished );

    if ( data.entries[ i ].datePublished ) {
      if ( previousDate !== extractedDay && outputType == "BlogPosting" ) {
        itemsMarkup += "<li data-role='list-divider'>" + extractedDay + "</li>";
        previousDate = extractedDay;
      }
      data.entries[ i ].datePublished = extractTime(data.entries[ i ].datePublished);
    }

    if ( outputType == "BlogPosting" ) {
      itemsMarkup +=  $( "#blogPostingListTemplate" ).render( data.entries[ i ] );
    } else if ( outputType == "VideoObject" ) {
      itemsMarkup +=  $( "#mediaObjectListTemplate" ).render( data.entries[ i ] );
    } else if ( outputType == "ImageObject" ) {
      itemsMarkup +=  $( "#imageObjectListTemplate" ).render( data.entries[ i ] );
    } else if ( outputType == "Article/Status" ) {
      itemsMarkup +=  $( "#statusListTemplate" ).render( data.entries[ i ] );
    } else {
      itemsMarkup +=  $( "#genericListTemplate" ).render( data.entries[ i ] );
    }
  }

  return itemsMarkup;
}

function createPage( dataSourceId, data, urlObj, articleId ) {

  $( "#video-player" ).html( "" );

  var $page;
  var contentMarkup = "";

  // The markup we are going to inject into the content area of the page.
  if ( articleId === undefined ) {
    $page = $( "#list-page" );
  } else {
    $page = $( "#content-page" );
  }

  // Get the header for the page.
  var $header = $page.children( ":jqmData(role=header)" ),

      // Get the content area element for the page.
      $content = $page.children( ":jqmData(role=content)" ),

      // Get the footer for the page.
      $footer = $page.children( ":jqmData(role=footer)" ),

      // The markup we are going to inject into the footer area of the page.
      footerMarkup = "<div data-role='navbar'><ul>",

      // Set the options used when changing page.
      options = data.options;

  // Empty the content area
  $content.html( "" );

  var tabs = template.options.tabs;

  if (tabs) {
    // Generate a navbar item for each datasources and add it to our markup.
    for ( var i = 0; i < tabs.length; i++ ) {
      var name = ( tabs[ i ] && tabs[ i ].name ) || dataSources[ i ].name;
      var icon = ( tabs[ i ] && tabs[ i ].icon ) || "grid"; // TODO: depends of data source type instead

      footerMarkup += "<li><a href='#datasource=" + i + "' data-icon='" + icon + "'>" + name + "</a></li>";
    }
    footerMarkup += "</ul></div>";
  }

  // Find the h1 element in our header and inject the name of the app into it.
  $header.find( "h1" ).html( app.name );

  // Inject the footer items markup into the footer element.
  $footer.html( footerMarkup );

  if (dataSources) {


    // Pages are lazily enhanced. We call page() on the page
    // element to make sure it is always enhanced before we
    // attempt to enhance the listview markup we just injected.
    // Subsequent calls to page() are ignored since a page/widget
    // can only be enhanced once.
    $page.page();

    $footer.trigger( "create" );

    // Now that the page is enhanced, highilight the good item on the footer.
    $footer.find( "li:nth-child(" + ( parseInt(dataSourceId, 10) + 1 ) + ") a" ).addClass( "ui-btn-active" );

    // Also, display the loading spinner, while waiting for data
    $.mobile.showPageLoadingMsg();

    // We don't want the data-url of the page we just modified
    // to be the url that shows up in the browser's location field,
    // so set the dataUrl option to the URL for the category
    // we just loaded.
    if (urlObj) {
      options.dataUrl = urlObj.href;
    }

    options.allowSamePageTransition = true;
    if ( articleId === undefined ) {
      options.transition = "none";
    } else {
      options.transition = "slide";
    }

    // Now call changePage() and tell it to switch to the page we just modified.
    $.mobile.changePage( $page, options );

    // Everything is done but loading the content. Display the spinner.
    $.mobile.showPageLoadingMsg();


    find(dataSourceId, {
      skip: 0,
      limit: 20
    }, function(err, data) {

      if ( err ) { console.error( err ); return; }

      var itemMarkup = '';
      var lastRequestedPage = 0;
      var currentPage = 0;
      var outputType = dataSources[ dataSourceId ].config.outputType;
      var singleEntry = (data.entries.length === 1);

      if ( articleId === undefined && !singleEntry) {

        var list = document.createElement('ul');

        if ( outputType == "ImageObject" ) {
          // For PhotoSwipe
          list.className = 'gallery'
        } else {
          list.dataset.role = 'listview';
        }

        itemsMarkup = getListItemsMarkup(dataSourceId, data);

        // Inject the category items markup into the content element.
        list.innerHTML = itemsMarkup;
        $content.innerHTML = '';
        $content[0].appendChild(list);


        // Prepare the load more
        var pendingLoadMore = false;

        window.onscroll = function(e) {
          var max = Math.ceil($(list).height() - window.innerHeight + Math.ceil($('.ui-navbar').height()) + Math.ceil($('.ui-header').height()));
          var ratio = window.scrollY / max;
          if( ratio > 0.8 && !pendingLoadMore) {
            pendingLoadMore = true;
            currentPage += 1;

            find(dataSourceId, {
              skip: currentPage * 20,
              limit: 20
            }, function(err, data) {
              var moreMarkup = getListItemsMarkup(dataSourceId, data);
              $(list).append(moreMarkup);

              if ( outputType === 'ImageObject') {

              } else {
                $(list).listview('refresh');
              }

              pendingLoadMore = false;
              // Enhance the listview we just injected.
              //$content.find( ":jqmData(role=listview)" ).listview();
            });
          }
        }


        // Activate PhotoSwipe
        if ( outputType == "ImageObject" ) {

          //contentMarkup = "<style id=\"gallery-style\"></style><ul class='gallery'>";
          var galleryStyleTag = document.createElement('style');
          galleryStyleTag.id = 'gallery-style';
          $(list).before(galleryStyleTag);
          // Enhance the style of gallery image
          // 30 = content page padding, 12 = <li>'s margin+border
          var imageWidth = ((window.innerWidth - 30) / 3 ) - 12 | 0;
          $( galleryStyleTag ).text('.gallery li a { width: ' + imageWidth +'px; height: ' + imageWidth +'px}');
          photoSwipeInstance = $( ".gallery a" ).photoSwipe({
            jQueryMobile: true,
            preventSlideshow: true
          });
        } else {
          // Enhance the listview we just injected.
          $content.find( ":jqmData(role=listview)" ).listview();
        }
      } else {
        var item = data.entries[articleId];
        if (singleEntry) {
          item = data.entries[0];
        }

        if ( item["@type"] == "BlogPosting" ) {
          contentMarkup += $( "#blogPostingTemplate" ).render( item );
        } else if ( item["@type"] == "ImageObject" ) {
          contentMarkup += $( "#imageObjectTemplate" ).render( item );
        } else if ( item["@type"] == "VideoObject" ) {
          contentMarkup += $( "#videoObjectTemplate" ).render( item );
        } else {
          contentMarkup += $( "#genericTemplate" ).render( item );
        }

        // Inject the category items markup into the content element
        // and trigger a create event to enhance the fresh markup.
        $content.html( contentMarkup ).trigger( 'create' );

        // mediaFactory needs the markup to inserted into the DOM before adding its
        // own code.
        if ( item["@type"] == "VideoObject" ) {
          mediaFactory.insert(item, { strategy: "html5" }, 'video-player', function(err) {
            if (err) console.error(err);
          });
        }
      }

      $.mobile.hidePageLoadingMsg();
    });
  } else {
    $content.html( "<p style=\"text-align: center\">No datasources selected.</p>" );
    $.mobile.hidePageLoadingMsg();
  }
}

// Listen for any attempts to call changePage()
$(document).bind( "pagebeforechange", function( e, data ) {

  // Change theme of our application if tizenTemplate is enabled we define f. it's priority
  // TODO: don't do it each page changing...gi
  if(template.options.tizenTemplate && device.type == "tizen-phone") {

      $( "[data-role=header], [data-role=footer]" ).attr( { "data-theme": "f" } );
      $( "[data-role=content]" ).attr( { "data-theme": "f" } );
      $( "[data-role=page]" ).removeClass("ui-body-c").addClass("ui-body-f");

  } else {

    if ( template.options.theme ) {
      $( "[data-role=header], [data-role=footer]" ).attr( { "data-theme": template.options.theme } );
    }
    if ( template.options.contentTheme ) {
      $( "[data-role=content]" ).attr( { "data-theme": template.options.contentTheme } );
    }

  }


  // string = app is asking us to load a page by URL
  if ( typeof data.toPage === "string" ) {

    var u = $.mobile.path.parseUrl( data.toPage ),
        re = /^#datasource/;

    // We only want to handle URLs that request the data for
    // a specific datasource.
    if ( u.hash.search(re) !== -1 ) {
      var matching = u.hash.match(/.*datasource=([0-9]+)(?:&article=([0-9]+))*/);
      var dataSourceId = matching[1];
      var articleId = matching[2];

      if ( dataSourceId !== undefined && articleId === undefined ) {
        createPage( dataSourceId, data, u );
      } else if ( dataSourceId !== undefined ) {
        createPage( dataSourceId, data, u, articleId );
      }
    }

    e.preventDefault();
  } else if (firstLaunch) { // first load (loading first page and ???)
    firstLaunch = false;

    // Let's assume we're launching the application for the first time
    // Building the list page for the first datasource
    // TODO: later, just redirect to /datasource-0 and let the corresponding function handle it
    createPage( 0, data );

    e.preventDefault();
  }
});
