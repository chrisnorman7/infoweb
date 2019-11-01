"""The web proxy."""

import os.path

from base64 import b64decode
from urllib.parse import urljoin

import requests

from bs4 import BeautifulSoup
from flask import Flask, jsonify, render_template, request
from requests.exceptions import MissingSchema, RequestException

app = Flask(__name__)
app.config['TEMPLATES_AUTO_RELOAD'] = True


@app.route('/')
def index():
    """The index page."""
    js_filename = os.path.join('static', 'main.js')
    return render_template(
        'index.html', js_modified=os.path.getmtime(js_filename)
    )


@app.route('/load/', methods=['POST'])
def load():
    """Load a URL and return page contents."""
    url = b64decode(request.args['url']).decode()
    form = request.form
    method = request.args.get('method', 'GET')
    d = {}
    func = getattr(requests, method.lower())
    if 'agent' in request.args:
        headers = {
            'User-Agent': b64decode(request.args['agent'].encode()).decode()
        }
    else:
        headers = None
    try:
        try:
            response = func(url, form, headers=headers)
        except MissingSchema:
            url = 'https://' + url
            response = func(url, form, headers=headers)
        url = response.url
        d['url'] = url
        s = BeautifulSoup(response.content, 'html.parser')
        if s.title is None:
            title = 'Untitled'
        else:
            title = s.title.text
        d['title'] = title
        s = s.body
        if s is None:
            d['page'] = 'This page is empty.'
        else:
            for tag in s.find_all(
                lambda tag: tag.name in ('iframe', 'frame', 'script', 'style')
            ):
                tag.decompose()
            for img in s.find_all('img'):
                if img.alt:
                    img.name = 'cite'
                    img['text'] = img.attrs.pop('alt')
                else:
                    img.decompose()
            for a in s.find_all('a'):
                if a.attrs.get('href', None):
                    if '://' not in a['href']:
                        a['href'] = urljoin(url, a['href'])
                else:
                    a.decompose()
            for form in s.find_all('form'):
                action = form.get('action')
                if action is None:
                    continue
                if action.startswith('/') or '://' not in action:
                    form['action'] = urljoin(url, form['action'])
            d['page'] = s.prettify()
    except RequestException as e:
        d['title'] = 'Error'
        d['page'] = str(e)
    return jsonify(d)


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=4636, debug=False)
