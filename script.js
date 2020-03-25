let counter = 0; 
let inputlength = 0;
let timeCreated = new Date().toLocaleTimeString();

// (function getStore(){
// 	let store = localStorage.getItem('') || 'nothing to see here';
// 	console.log(`getting local here: ${store}`)
// })();

$( "#tostore" ).keyup(function() {
  if (event.keyCode === 13) {
    event.preventDefault();
    // document.getElementById("submit").click();
    storeLocal();
  }

  inputlength = $('#tostore').val().length;
  console.log(inputlength);

  $("#charlength").html(inputlength);

});

(function getinputvalue(){
	inputlength = $('#tostore').val().length;
	$("#charlength").html(inputlength);
})();

function storeLocal(){
	const input = $('#tostore').val();

	if (input !== ""){
		counter++;
		console.log(input);
		localStorage.setItem(counter, input); 
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

