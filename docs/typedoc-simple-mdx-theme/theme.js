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
    this.excludePrivate = true;
    // this.hidePageTitle = true;

    // always hide type hierarchy
    Handlebars.registerHelper('ifShowTypeHierarchy', function (options) {
      return options.inverse(this);
    });

    Handlebars.registerHelper('reflectionPath', function () {
      // skip reflection links since we're going to be manually inserting defs into docs
      return null;
    });

    Handlebars.registerHelper('ifShowReturns', function () {
      // hide the returns in output
      return null;
    });

    Handlebars.registerHelper('logThis', function () {
      console.log(this);
      return null;
    });

    Handlebars.registerHelper('tocAnchor', function () {
      if (this.sources?.length > 0) {
        const srcFilename = this.sources[0].fileName;
        const srcFileBaseName = path.basename(srcFilename, '.ts');
        return `{#${srcFileBaseName}-${this.name}}`;
      }
      if (this.signatures?.length > 0) {
        const signature = this.signatures[0].name;
        const signatureParts = signature.split(/\s+/);
        const finalSignaturePart = signatureParts[signatureParts.length - 1];
        return `{#${finalSignaturePart}-${this.name}}`;
      }
      return this.name;
    });

    const originalTypeHelper = Handlebars.helpers.type;
    const originalReflectionTitle = Handlebars.helpers.reflectionTitle;

    // the real type helper is too complicated to try to copy/rewrite,
    // so just hackily remove any markdown links from the output
    Handlebars.registerHelper('type', function (collapse, emphasis) {
      const originalOutput = originalTypeHelper.call(this, collapse, emphasis);
      return originalOutput.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
    });

    Handlebars.registerHelper('reflectionTitle', function (reflection) {
      const originalOutput = originalReflectionTitle.call(this, reflection);
      return originalOutput;
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
  app.renderer.defineTheme('simple-mdx', SimpleMdTheme);
};
