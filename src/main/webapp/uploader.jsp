<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Stats upload Page</title>
</head>

<body>
<form action="/api/contentUpdate" method="post" enctype="multipart/form-data" name="form1" >
    <input type="file" name="content_update" accept="application/zip">
    <input type="submit">
</form>
</body>

</html>
