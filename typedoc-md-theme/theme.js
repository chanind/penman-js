const fs = require('fs');
const path = require('path');

const Handlebars = require('handlebars');

const { MarkdownTheme } = require('typedoc-plugin-markdown');

class SimpleMdTheme extends MarkdownTheme {
  constructor(renderer) {
    super(renderer);

    this.hideBreadcrumbs = true;
    this.allReflectionsHaveOwnDocument = true;
    this.hideInPageTOC = true;
    // this.hidePageTitle = true;

    Handlebars.registerHelper('reflectionPath', function () {
      // skip reflection links since we're going to be manually inserting defs into docs
      return null;
    });

    const originalTypeHelper = Handlebars.helpers.type;

    // the real type helper is too complicated to try to copy/rewrite,
    // so just hackily remove any markdown links from the output
    Handlebars.registerHelper('type', function (collapse, emphasis) {
      const originalOutput = originalTypeHelper.call(this, collapse, emphasis);
      return originalOutput.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
    });

    registerPartials();
  }

  toUrl(mapping, reflection) {
    const originalUrl = super.toUrl(mapping, reflection);
    return originalUrl.replace('.md', '.mdx');
  }

  getReflectionTemplate() {
    return (pageEvent) => {
      return reflectionTemplate(pageEvent, {
        allowProtoMethodsByDefault: true,
        allowProtoPropertiesByDefault: true,
        data: { theme: this },
      });
    };
  }

  getReflectionMemberTemplate() {
    return (pageEvent) => {
      return reflectionMemberTemplate(pageEvent, {
        allowProtoMethodsByDefault: true,
        allowProtoPropertiesByDefault: true,
        data: { theme: this },
      });
    };
  }

  getIndexTemplate() {
    return (pageEvent) => {
      return indexTemplate(pageEvent, {
        allowProtoMethodsByDefault: true,
        allowProtoPropertiesByDefault: true,
        data: { theme: this },
      });
    };
  }
}

const TEMPLATE_PATH = path.join(__dirname, 'resources', 'templates');

const indexTemplate = Handlebars.compile(
  fs.readFileSync(path.join(TEMPLATE_PATH, 'index.hbs')).toString(),
);

const reflectionTemplate = Handlebars.compile(
  fs.readFileSync(path.join(TEMPLATE_PATH, 'reflection.hbs')).toString(),
);

const reflectionMemberTemplate = Handlebars.compile(
  fs.readFileSync(path.join(TEMPLATE_PATH, 'reflection.member.hbs')).toString(),
);

// copied from https://github.com/tgreyuk/typedoc-plugin-markdown/blob/master/packages/typedoc-plugin-markdown/src/render-utils.ts#L46
function registerPartials() {
  const partialsFolder = path.join(__dirname, 'resources', 'partials');
  const partialFiles = fs.readdirSync(partialsFolder);
  partialFiles.forEach((partialFile) => {
    const partialName = path.basename(partialFile, '.hbs');
    const partialContent = fs
      .readFileSync(partialsFolder + '/' + partialFile)
      .toString();
    Handlebars.registerPartial(partialName, partialContent);
  });
}

exports.load = (app) => {
  app.renderer.defineTheme('simple-md', SimpleMdTheme);
};
