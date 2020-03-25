let counter = 0; 
let inputlength = 0;
let timeCreated;
let notetitle;

$( "#tostore" ).keyup(function() {
  if (event.keyCode === 13) {
    event.preventDefault();
    storeLocal();
  }

  inputlength = $('#tostore').val().length;
  $("#charlength").html(inputlength);

});

$( "#branding" ).keyup(function() {
	title = $('#branding').find('span').html();
	$('title').html(title);
	localStorage.setItem("title", title);

	if($('title').find('span').html() < 1){
		$('title').find('span').html("add a note.")
	}
});

(function getinputvalue(){

	// $('#branding').find('br').remove();

	inputlength = $('#tostore').val().length;
	$("#charlength").html(inputlength);

	if(localStorage.getItem("title") !== null){
		$('#branding').find('span').html(localStorage.getItem("title"));
		$('title').html(localStorage.getItem("title"));
	}

})();

function storeLocal(){
	const input = $('#tostore').val();
	timeCreated = Date().toLocaleString() ;

	if (input !== ""){
		counter++;
		$("#list").append(`<div class="list"><input type="checkbox" id="checkbox" name="checkbox${counter}"><label for="checkbox${counter}">${input}</div>`)
		$('#tostore').val("");
	} else {
		throw new Error("input field empty");
	}
}

function deleteItem() {
	console.log("dingo")
    $(this).remove();
}

function deleteList(){
	$("#list").html("");
	localStorage.clear();
}
