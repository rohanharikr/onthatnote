let counter = 0; 
let inputlength = 0;
let timeCreated = new Date().toLocaleTimeString();
let title;

$( "#tostore" ).keyup(function() {
  if (event.keyCode === 13) {
    event.preventDefault();
    storeLocal();
  }

  inputlength = $('#tostore').val().length;
  console.log(inputlength);

  $("#charlength").html(inputlength);

});

$( "#branding" ).keyup(function() {
	console.log("hmm")
	title = $('#branding').html();

	localStorage.setItem("title", title);

});

(function getinputvalue(){
	inputlength = $('#tostore').val().length;
	$("#charlength").html(inputlength);

	if(localStorage.getItem("title") !== null){
		$('#branding').html(localStorage.getItem("title"));
	}

})();

function storeLocal(){
	const input = $('#tostore').val();

	if (input !== ""){
		counter++;
		console.log(input);
		$("#list").append(`<div class="list"><input type="checkbox" id="checkbox" name="checkbox${counter}"><label for="checkbox${counter}">${input}</label></div>`)
		$('#tostore').val("");
	} else {
		throw new Error("input field empty")
	}
}

function deleteList(){
	$("#list").html("");
	localStorage.clear();
}
