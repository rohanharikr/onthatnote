let counter = 0; 
let inputlength = 0;
let timeCreated;
let notetitle;
let createList = 0;
let completed = 0;




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

$( "#branding" ).click(function() {
	 let title = $('#branding').find('span').html();

	if (title == "give me a name"){
		$('#branding').find('span').html("");
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

	$("#completed, #list").show();

	if (input !== ""){
		counter++;
		$("#list").append(`<div class="list"><input type="checkbox" id="checkbox" name="checkbox${counter}"><label for="checkbox${counter}">${input}</div>`)
		$('#tostore').val("");
	} else {
		throw new Error("input field empty");
	}

	createList++;
    $(".listcounter").html(createList);
}

function deleteItem() {
	// console.log("dingo")
    $(this).remove();
}

function deleteList(){
	$("#list").html("");
	localStorage.clear();
}


$(document).on('mousedown', '#checkbox', function() {

      if (!$(this).is(':checked')) {
		
      		let complete = $(this).find('label').html();
      		completed++;

      		let checked = (createList - completed)

      		$(".completed").html(checked);
            $(".checked").html(completed);
            $("#completed").append(`<div class="list"><input style="border: 1px solid #696969" type="checkbox" id="checkbox" name="checkbox${counter}" checked><label for="checkbox${counter}">${complete}</div>`)
            // $(this).fadeOut(600, function() {$(this).parent().remove(); });
            $(this).parent().remove();
        }
});





clearlocalstorage = () => {localStorage.clear(); location.reload();};
