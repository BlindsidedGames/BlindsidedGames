function getData(form) {
    let formData = Object.fromEntries(new FormData(form).entries());
    console.log(formData);
    if (!formData.name || !formData.email || !formData.message) {
        alert("erorr! missing data");
    } else {
        document.location.href = `mailto:Blindsidedgames@outlook.com?subject=Blindsided Games - new email from ${formData.name}!&body=Message sent by ${formData.name}, from ${formData.email}.%0D%0A${formData.message}`;
    }
}  