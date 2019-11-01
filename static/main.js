function setTitle(s) { document.title = `${s} | InfoWeb` }

window.onload = () => {
    window.onpopstate = (e) => {
        loadURL(e.state.url)
    }
    setTitle("Nothing Loaded Yet")
    urlForm.onsubmit = (e) => {
        e.preventDefault()
        loadURL()
    }
}

const urlForm = document.querySelector("#urlForm")
const url = document.querySelector("#url")
const status = document.querySelector("#status")
const historyList = document.querySelector("#history")
const urls = []
const page = document.getElementById("page")

function submitForm(e) {
    e.preventDefault()
    let form = e.target
    let fd = new FormData(form)
    loadURL(form.action, fd, form.method.toUpperCase())
}

function clickLink(e) {
    e.preventDefault()
    if (e.target.href === undefined) {
        alert("This link has no href.")
    } else {
        loadURL(e.target.href)
    }
}

function loadURL(s, formData, method) {
    if (s === undefined) {
        s = url.value
    } else {
        url.value = s
    }
    s = btoa(s)
    status.innerText = "Loading..."
    if (method === undefined) {
        method = "GET"
    }
    if (formData === undefined) {
        formData = null
    }
    let xhr = new XMLHttpRequest()
    xhr.open("POST", `${document.location.protocol}//${document.location.host}/load/?url=${s}&method=${method}&agent=${btoa(navigator.userAgent)}`)
    xhr.onerror = () => {
        setTitle("Error")
        status.innerText = `Error loading ${s}.`
    }
    xhr.onload = () => {
        url.select()
        let data = JSON.parse(xhr.response)
        url.value = data["url"]
        const title = data["title"]
        if (title == "Error") {
            status.innerText = "Error"
        } else {
            status.innerText = "Page loaded."
        }
        page.innerHTML = data["page"]
        setTitle(title)
        history.pushState({url: url.value}, document.title)
        for (let a of page.getElementsByTagName("a")) {
            if (["", "_top"].includes(a.target)) {
                a.onclick = clickLink
            }
        }
        for (let form of page.getElementsByTagName("form")) {
            form.onsubmit = submitForm
        }
        if (!urls.includes(url.value)) {
            urls.push(url.value)
            let li = document.createElement("li")
            let button = document.createElement("button")
            button.innerText = data["title"]
            button.id = url.value
            button.onclick = (e) => loadURL(e.target.id)
            li.appendChild(button)
            historyList.appendChild(li)
        }
    }
    xhr.send(formData)
}
