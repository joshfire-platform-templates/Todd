// TODO check if Joshfire.factory.config.datasources.main > 0
var factory = Joshfire.factory,
    app = factory.config.app,
    dataSources = (factory.getDataSource( "main" ) ? factory.getDataSource( "main" ).children : null),
    template = factory.config.template,
    firstLaunch = true;

if (app.icon) {
  var link = document.createElement("link");
  link.rel = "apple-touch-icon";
  link.href = app.icon.contentURL;
  document.head.appendChild(link);
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

  return dayNames[currentDate.getDay()] + "," + dayNames[currentDate.getMonth()] + " " + currentDate.getDate() + ", " + currentDate.getFullYear();
}

function createPage( dataSourceId, data, urlObj, articleId ) {

  $( "#video-player" ).html( "" );

  var $page,
      contentMarkup = "";

  // The markup we are going to inject into the content area of the page.
  if ( articleId === undefined ) {
    $page = $( "#list-page" );
    contentMarkup = "<ul data-role='listview'>";
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

  if (dataSources) {
    // Get the items from our dataSource
    dataSources[ dataSourceId ].find( {}, function ( err, data ) {
      if ( err ) { console.error( err ); return; }

      var outputType = dataSources[ dataSourceId ].config.outputType;
      var staticDS = dataSources[ dataSourceId ].config.db == "static";

      if ( staticDS ) {
        var staticItem = data.entries[0];

        // NOTE: we're erasing the value of this variable.
        contentMarkup = $( "#staticTemplate" ).render( staticItem );

        $content.html( contentMarkup );
      } else if ( articleId === undefined ) {

        var previousDate = null;

        // Generate a list item for each item in the category and add it to our markup.
        for ( var i = 0; i < data.entries.length; i++ ) {

          // Our item need to be extended to transmit useful information to the template
          data.entries[ i ].i = i;
          data.entries[ i ].dataSourceId = dataSourceId;

          var extractedDay = extractDay( data.entries[ i ].datePublished );

          if ( data.entries[ i ].datePublished ) {
            if ( previousDate !== extractedDay && outputType == "BlogPosting" ) {
              contentMarkup += "<li data-role='list-divider'>" + extractedDay + "</li>";
              previousDate = extractedDay;
            }
            data.entries[ i ].datePublished = extractTime(data.entries[ i ].datePublished);
          }

          if ( outputType == "BlogPosting" ) {
            contentMarkup +=  $( "#blogPostingListTemplate" ).render( data.entries[ i ] );
          } else if ( outputType == "ImageObject" || outputType == "VideoObject" ) {
            contentMarkup +=  $( "#mediaObjectListTemplate" ).render( data.entries[ i ] );
          } else if ( outputType == "Article/Status" ) {
            contentMarkup +=  $( "#statusListTemplate" ).render( data.entries[ i ] );
          } else {
            contentMarkup +=  $( "#genericListTemplate" ).render( data.entries[ i ] );
          }
        }
        contentMarkup += "</ul>";

        // Inject the category items markup into the content element.
        $content.html( contentMarkup );

        // Enhance the listview we just injected.
        $content.find( ":jqmData(role=listview)" ).listview();
      } else {
        var item = data.entries[articleId];

        if ( item.itemType == "BlogPosting" ) {
          contentMarkup += $( "#blogPostingTemplate" ).render( item );
        } else if ( item.itemType == "ImageObject" ) {
          contentMarkup += $( "#imageObjectTemplate" ).render( item );
        } else if ( item.itemType == "VideoObject" ) {
          contentMarkup += $( "#videoObjectTemplate" ).render( item );
        } else {
          contentMarkup += $( "#genericTemplate" ).render( item );
        }

        // Inject the category items markup into the content element
        // and trigger a create event to enhance the fresh markup.
        $content.html( contentMarkup ).trigger( 'create' );

        // mediaFactory needs the markup to inserted into the DOM before adding its
        // own code.
        if ( item.itemType == "VideoObject" ) {
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

  // Change theme of our application
  // TODO: don't do it each page changing...
  if ( template.options.theme ) {
    $( "[data-role=header], [data-role=footer]" ).attr( { "data-theme": template.options.theme } );
  }
  if ( template.options.contentTheme ) {
    $( "[data-role=content]" ).attr( { "data-theme": template.options.contentTheme } );
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