# Check the URLs concurently

- there are 3 case generates in result.json
    - Success, Failure, Soft Errors

* Success: URLs returned status code success doesn't has title "Page not found"
* Failure: URLs returned status code 404 or page not found
* Soft Errors: URLs returned status code 200 but those are 404 pages,
    - At soft errors I am checking page title contains Page not found

CONCURRENCY_LIMIT: Adjust it to set how many request hits in one instance of concurent window

create urls.txt file and add urls [random text url extraction supported eg:sitemap.xml] to check see below example

```
https://www.url1.demo updatedat 2272025https://www.url2.demo random text
```

it will generate urls.json array
```
[
    "https://www.url1.demo",
    "https://www.url2.demo"   
]
```

Do ```npm i```
Run using ```npm run scan```
