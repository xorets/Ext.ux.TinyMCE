$( function() {

	$("#mbAmountNoScript").css( "display", "none" );
	
	$("#mbAmount2").keypress( function() {
		window.setTimeout( function() {
			$("#mbAmount").val( $("#mbAmount2").val());
		}, 0 );
	});
});
