import { run } from '@ember/runloop';
import { test, module } from 'qunit';
import { setupTest, setupRenderingTest } from 'ember-qunit';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import DefaultSchema from 'ember-m3/services/m3-schema';

class TestSchema extends DefaultSchema {
  includesModel() {
    return true;
  }

  computeNestedModel(key, value, modelName) {
    if (value == null) {
      return null;
    }
    if (Array.isArray(value)) {
      return null;
    }
    if (typeof value === 'object' && value.constructor !== Date) {
      return {
        id: null,
        type: `${modelName}.${key}`,
        attributes: value,
      };
    }
  }

  computeAttributeReference(key, value) {
    if (typeof value === 'string' && value.startsWith('urn:li:')) {
      return {
        id: value,
        type: null,
      };
    }
    return null;
  }
}

module('unit/model/native-proxy', function () {
  module('basic', function (hooks) {
    setupTest(hooks);

    hooks.beforeEach(function () {
      this.store = this.owner.lookup('service:store');
      this.store.useProxy = true;

      this.owner.register('service:m3-schema', TestSchema);

      this.store.push({
        data: {
          id: 'urn:li:book:1',
          type: 'com.example.bookstore.Book',
          attributes: {
            title: 'How to Win Friends and Influence People',
            author: 'Dale Carnegie',
            tags: ['self-help', 'best-seller'],
          },
        },
      });
    });

    test('can access attribute without get', function (assert) {
      let book = this.store.peekRecord('com.example.bookstore.Book', 'urn:li:book:1');

      assert.strictEqual(book.title, 'How to Win Friends and Influence People');
    });

    test('can access array attribute without get', function (assert) {
      let book = this.store.peekRecord('com.example.bookstore.Book', 'urn:li:book:1');

      assert.deepEqual(book.tags, ['self-help', 'best-seller']);
    });

    test('can use with object spread', function (assert) {
      let book = this.store.peekRecord('com.example.bookstore.Book', 'urn:li:book:1');

      const obj = {
        ...book,
      };

      assert.deepEqual(obj, {
        title: 'How to Win Friends and Influence People',
        author: 'Dale Carnegie',
        tags: ['self-help', 'best-seller'],
      });
    });

    test('new keys are available for object spread', function (assert) {
      let book = this.store.peekRecord('com.example.bookstore.Book', 'urn:li:book:1');

      let obj = {
        ...book,
      };

      run(() =>
        this.store.push({
          data: {
            id: 'urn:li:book:1',
            type: 'com.example.bookstore.Book',
            attributes: {
              year: 1936,
            },
          },
        })
      );

      obj = {
        ...book,
      };

      assert.deepEqual(obj, {
        title: 'How to Win Friends and Influence People',
        author: 'Dale Carnegie',
        tags: ['self-help', 'best-seller'],
        year: 1936,
      });
    });

    test('can use with array spread', function (assert) {
      let book = this.store.peekRecord('com.example.bookstore.Book', 'urn:li:book:1');

      const objs = [...book.tags];

      assert.deepEqual(objs, ['self-help', 'best-seller']);
    });
  });

  module('nested models', function (hooks) {
    setupTest(hooks);

    hooks.beforeEach(function () {
      this.store = this.owner.lookup('service:store');
      this.store.useProxy = true;

      this.owner.register('service:m3-schema', TestSchema);

      this.store.push({
        data: {
          id: 'urn:li:book:1',
          type: 'com.example.bookstore.Book',
          attributes: {
            title: 'How to Win Friends and Influence People',
            author: 'Dale Carnegie',
            metadata: {
              isbn: '1-4391-6734-6',
            },
            similarBooks: [
              {
                title: 'The Quick and Easy Way to Effective Speaking',
                author: 'Dale Carnegie',
              },
            ],
          },
        },
      });
    });

    test('can access without get', function (assert) {
      let book = this.store.peekRecord('com.example.bookstore.Book', 'urn:li:book:1');

      assert.strictEqual(book.metadata.isbn, '1-4391-6734-6');
    });

    test('can access array without get', function (assert) {
      let book = this.store.peekRecord('com.example.bookstore.Book', 'urn:li:book:1');

      assert.equal(book.similarBooks.length, 1);
      assert.strictEqual(
        book.similarBooks[0].title,
        'The Quick and Easy Way to Effective Speaking'
      );
    });

    test('can use with object spread', function (assert) {
      let book = this.store.peekRecord('com.example.bookstore.Book', 'urn:li:book:1');

      const obj = {
        ...book.metadata,
      };

      assert.deepEqual(obj, {
        isbn: '1-4391-6734-6',
      });
    });

    test('can use with array spread', function (assert) {
      let book = this.store.peekRecord('com.example.bookstore.Book', 'urn:li:book:1');

      const objs = [...book.similarBooks];

      assert.deepEqual(objs, [
        {
          title: 'The Quick and Easy Way to Effective Speaking',
          author: 'Dale Carnegie',
        },
      ]);
    });
  });

  module('references', function (hooks) {
    setupTest(hooks);

    hooks.beforeEach(function () {
      this.store = this.owner.lookup('service:store');
      this.store.useProxy = true;

      this.owner.register('service:m3-schema', TestSchema);

      this.store.push({
        data: {
          id: 'urn:li:book:1',
          type: 'com.example.bookstore.Book',
          attributes: {
            title: 'How to Win Friends and Influence People',
            author: 'urn:li:author:1',
            similarBooks: ['urn:li:book:2'],
          },
        },
        included: [
          {
            id: 'urn:li:author:1',
            type: 'com.example.bookstore.Author',
            attributes: {
              name: 'Dale Carnegie',
            },
          },
          {
            id: 'urn:li:book:2',
            type: 'com.example.bookstore.Book',
            attributes: {
              title: 'The Quick and Easy Way to Effective Speaking',
              author: 'urn:li:author:1',
            },
          },
        ],
      });
    });

    test('can access without get', function (assert) {
      let book = this.store.peekRecord('com.example.bookstore.Book', 'urn:li:book:1');

      assert.strictEqual(book.author.name, 'Dale Carnegie');
    });

    test('can access array without get', function (assert) {
      let book = this.store.peekRecord('com.example.bookstore.Book', 'urn:li:book:1');

      assert.equal(book.similarBooks.length, 1);
      assert.strictEqual(
        book.similarBooks[0].title,
        'The Quick and Easy Way to Effective Speaking'
      );
    });

    test('can use with object spread', function (assert) {
      let book = this.store.peekRecord('com.example.bookstore.Book', 'urn:li:book:1');

      const obj = {
        ...book.author,
      };

      assert.deepEqual(obj, {
        name: 'Dale Carnegie',
      });
    });

    test('can use with array spread', function (assert) {
      let book = this.store.peekRecord('com.example.bookstore.Book', 'urn:li:book:1');

      const similarBook = book.similarBooks[0];
      const objs = [...book.similarBooks];

      assert.deepEqual(objs, [similarBook]);
    });

    test('maintains reference identity', function (assert) {
      let book = this.store.peekRecord('com.example.bookstore.Book', 'urn:li:book:1');

      const author = book.author;
      const similarBookAuthor = book.similarBooks[0].author;

      assert.strictEqual(author, similarBookAuthor);
    });
  });

  module('rendering', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
      this.store = this.owner.lookup('service:store');
      this.store.useProxy = true;

      this.owner.register('service:m3-schema', TestSchema);

      this.store.push({
        data: {
          id: 'urn:li:book:1',
          type: 'com.example.bookstore.Book',
          attributes: {
            title: 'How to Win Friends and Influence People',
            metadata: {
              isbn: '1-4391-6734-6',
            },
            translations: [
              {
                title: 'Wie Man Freunde Gewinnt',
              },
              {
                title: 'Comment Se Faire Des Amis',
              },
            ],
          },
        },
      });
    });

    test('can render content', async function (assert) {
      this.book = this.store.peekRecord('com.example.bookstore.Book', 'urn:li:book:1');

      await render(hbs`{{this.book.title}}`);

      assert.strictEqual(this.element.textContent, 'How to Win Friends and Influence People');
    });

    test('updates content on change', async function (assert) {
      this.book = this.store.peekRecord('com.example.bookstore.Book', 'urn:li:book:1');

      await render(hbs`{{this.book.title}}`);

      await run(() =>
        this.store.push({
          data: {
            id: 'urn:li:book:1',
            type: 'com.example.bookstore.Book',
            attributes: {
              title: 'The Way Things Work',
            },
          },
        })
      );

      assert.strictEqual(this.element.textContent, 'The Way Things Work');
    });

    test('updates content on nested model change', async function (assert) {
      this.book = this.store.peekRecord('com.example.bookstore.Book', 'urn:li:book:1');

      await render(hbs`{{this.book.metadata.isbn}}`);

      await run(() =>
        this.store.push({
          data: {
            id: 'urn:li:book:1',
            type: 'com.example.bookstore.Book',
            attributes: {
              metadata: {
                isbn: '0-395-42857-2',
              },
            },
          },
        })
      );

      assert.strictEqual(this.element.textContent, '0-395-42857-2');
    });

    test('updates content on array of nested model change', async function (assert) {
      this.book = this.store.peekRecord('com.example.bookstore.Book', 'urn:li:book:1');

      await render(hbs`
      <ul>
      {{#each this.book.translations as |translation|}}
        <li>{{translation.title}}</li>
      {{/each}}
      </ul>
      `);

      await run(() =>
        this.store.push({
          data: {
            id: 'urn:li:book:1',
            type: 'com.example.bookstore.Book',
            attributes: {
              translations: [
                {
                  title: 'Wie Man Freunde Gewinnt',
                },
                {
                  title: 'Comment Se Faire Des Amis',
                },
              ],
            },
          },
        })
      );

      const translations = Array.from(this.element.querySelectorAll('li')).map(
        (li) => li.textContent
      );
      assert.deepEqual(translations, ['Wie Man Freunde Gewinnt', 'Comment Se Faire Des Amis']);
    });
  });
});
