# Local test environment (not part of the theme)

Runs the theme in WordPress Playground, seeded with 100 real posts from stephenlegal.ng.

1. Fetch the content snapshots (from the repo root):

   ```bash
   curl -s "https://stephenlegal.ng/wp-json/wp/v2/posts?per_page=100&_embed=1" -o dev/posts.json
   curl -s "https://stephenlegal.ng/wp-json/wp/v2/categories?per_page=100" -o dev/cats.json
   curl -s "https://stephenlegal.ng/wp-json/wp/v2/pages?per_page=100" -o dev/pages.json
   ```

2. Start Playground (on Windows Git Bash, prefix with `MSYS_NO_PATHCONV=1`):

   ```bash
   npx -y @wp-playground/cli@3.1.61 server --port=9400 \
     --mount=.:/wordpress/wp-content/themes/stephenlegal-editorial \
     --mount=./dev:/sl-dev \
     --mount=./dev/mu-plugins:/wordpress/wp-content/mu-plugins \
     --blueprint=./dev/blueprint.json --login
   ```

3. Open http://127.0.0.1:9400.

`mu-plugins/sl-dev-remote-images.php` serves featured images from the live site's URLs. Never install it on production.

Build an installable theme zip without this folder:

```bash
git archive --format=zip --prefix=stephenlegal-editorial/ -o stephenlegal-editorial.zip HEAD
```
