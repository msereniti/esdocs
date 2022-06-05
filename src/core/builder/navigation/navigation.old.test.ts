import { test } from 'uvu';
import * as assert from 'uvu/assert';

import { assembleNavigationTree, collapseIntermediatePaths, cutRelativePaths, findLabel } from './navigation.old';

test('navigation/utils/cutRelativePaths/multiple', () => {
  assert.equal(
    cutRelativePaths(['/system-root/projects/awesome/docs/intro.md', '/system-root/projects/awesome/docs/about.md', '/system-root/projects/awesome/docs/directory/other_file.md']),
    {
      basePath: '/system-root/projects/awesome/docs/',
      relativePaths: ['intro.md', 'about.md', 'directory/other_file.md'],
    }
  );
});
test('navigation/utils/cutRelativePaths/singluar', () => {
  assert.equal(cutRelativePaths(['/system-root/projects/awesome/docs/intro.md']), {
    basePath: '/system-root/projects/awesome/docs/',
    relativePaths: ['intro.md'],
  });
});
test('navigation/utils/collapseIntermediatePaths', () => {
  assert.equal(
    collapseIntermediatePaths([
      'intro.md',
      'docs/more/details/hello_world.md',
      'docs/more/details/another_thing.md',
      'docs/another_details/single_children.md',
      'docs/about/some_data.md',
      'docs/about/secondary/some_data.md',
    ]),
    {
      allProcessedPaths: [
        'intro.md',
        'docs/more_details/hello_world.md',
        'docs/more_details/another_thing.md',
        'docs/another_details_single_children.md',
        'docs/about/some_data.md',
        'docs/about/secondary_some_data.md',
      ],
      untouchedPaths: ['intro.md', 'docs/about/some_data.md'],
      collapsedPaths: ['docs/more_details/hello_world.md', 'docs/more_details/another_thing.md', 'docs/another_details_single_children.md', 'docs/about/secondary_some_data.md'],
      initPaths: {
        'docs/more_details': ['docs/more', 'docs/more/details'],
        'docs/more_details/hello_world.md': ['docs/more/details/hello_world.md'],
        'docs/more_details/another_thing.md': ['docs/more/details/another_thing.md'],
        'docs/another_details_single_children.md': ['docs/another_details', 'docs/another_details/single_children.md'],
        'docs/about/secondary_some_data.md': ['docs/about/secondary', 'docs/about/secondary/some_data.md'],
      },
    }
  );
});
test('navigation/utils/findLabel/file', () => {
  assert.equal(
    findLabel(
      'docs/intro/about.md',
      {
        'docs/intro/about.md': 'Documentation title',
        'docs/intro/about/some_children.md': 'Wrong!',
      },
      ['md', 'mdx']
    ),
    'Documentation title'
  );
});
test('navigation/utils/findLabel/without_extension', () => {
  assert.equal(
    findLabel(
      'docs/intro/about',
      {
        'docs/intro/about.md': 'Documentation title',
        'docs/intro/about/some_children.md': 'Wrong!',
      },
      ['md', 'mdx']
    ),
    'Documentation title'
  );
});
test('navigation/utils/findLabel/sibling', () => {
  assert.equal(
    findLabel(
      'docs/intro/about',
      {
        'docs/intro/about.md': 'Documentation title',
        'docs/intro/about/some_children.md': 'Wrong!',
      },
      ['md', 'mdx']
    ),
    'Documentation title'
  );
});
test('navigation/utils/findLabel/index', () => {
  assert.equal(
    findLabel(
      'docs/intro/about',
      {
        'docs/intro/about/index.md': 'Documentation title',
        'docs/intro/about/some_children.md': 'Wrong!',
      },
      ['md', 'mdx']
    ),
    'Documentation title'
  );
});
test('navigation/utils/findLabel/children', () => {
  assert.equal(
    findLabel(
      'docs/intro/about',
      {
        'docs/intro/about/about.md': 'Documentation title',
        'docs/intro/about/some_children.md': 'Wrong!',
      },
      ['md', 'mdx']
    ),
    'Documentation title'
  );
});
test('navigation/utils/findLabel/single-children', () => {
  assert.equal(
    findLabel(
      'docs/intro/about',
      {
        'docs/intro/about/some_children.md': 'Documentation title',
        'docs/some_another_children.md': 'Wrong!',
      },
      ['md', 'mdx']
    ),
    'Documentation title'
  );
});

test('navigation/assembleNavigationTree', () => {
  assert.equal(
    assembleNavigationTree(
      [
        '/system-root/projects/awesome/docs/intro.md',
        '/system-root/projects/awesome/docs/intro/author.md',
        '/system-root/projects/awesome/docs/intro/thanks.md',
        '/system-root/projects/awesome/docs/components/forms/text.md',
        '/system-root/projects/awesome/docs/components/forms/number.md',
        '/system-root/projects/awesome/docs/controls/controls.md',
        '/system-root/projects/awesome/docs/controls/buttons/button.md',
        '/system-root/projects/awesome/docs/controls/buttons/checkbox.md',
        '/system-root/projects/awesome/docs/controls/radio/radio-button.md',
        '/system-root/projects/awesome/docs/controls/radio/radio-flag.md',
        '/system-root/projects/awesome/docs/controls/radio/some/secret/weapon.md',
      ],
      [
        '/system-root/projects/awesome/dist/docs/intro.js',
        '/system-root/projects/awesome/dist/docs/intro/author.js',
        '/system-root/projects/awesome/dist/docs/intro/thanks.js',
        '/system-root/projects/awesome/dist/docs/components/forms/text.js',
        '/system-root/projects/awesome/dist/docs/components/forms/number.js',
        '/system-root/projects/awesome/dist/docs/controls/controls.js',
        '/system-root/projects/awesome/dist/docs/controls/buttons/button.js',
        '/system-root/projects/awesome/dist/docs/controls/buttons/checkbox.js',
        '/system-root/projects/awesome/dist/docs/controls/radio/radio-button.js',
        '/system-root/projects/awesome/dist/docs/controls/radio/radio-flag.js',
        '/system-root/projects/awesome/dist/docs/controls/radio/some/secret/weapon.js',
      ],
      {
        '/system-root/projects/awesome/docs/intro.md': 'intro title',
        '/system-root/projects/awesome/docs/intro/author.md': 'author title',
        '/system-root/projects/awesome/docs/intro/thanks.md': 'thanks title',
        '/system-root/projects/awesome/docs/components/forms/text.md': 'text title',
        '/system-root/projects/awesome/docs/components/forms/number.md': 'number title',
        '/system-root/projects/awesome/docs/controls/controls.md': 'controls title',
        '/system-root/projects/awesome/docs/controls/buttons/button.md': 'button title',
        '/system-root/projects/awesome/docs/controls/buttons/checkbox.md': 'checkbox title',
        '/system-root/projects/awesome/docs/controls/radio/radio-button.md': 'radio-button title',
        '/system-root/projects/awesome/docs/controls/radio/radio-flag.md': 'radio-flag title',
        '/system-root/projects/awesome/docs/controls/radio/some/secret/weapon.md': 'secret weapon title',
      }
    ),
    {
      tree: {
        id: '[[root]]',
        label: '[[root]]',
        hasArticle: false,
        url: '/',
        children: [
          {
            id: 'intro',
            label: 'intro title',
            hasArticle: true,
            url: '/intro',
            children: [
              {
                id: 'intro_author',
                label: 'author title',
                hasArticle: true,
                url: '/intro/author',
                children: [],
              },
              {
                id: 'intro_thanks',
                label: 'thanks title',
                hasArticle: true,
                url: '/intro/thanks',
                children: [],
              },
            ],
          },
          {
            id: 'components_forms',
            label: 'components_forms',
            hasArticle: false,
            url: '/components/forms',
            children: [
              {
                id: 'components_forms_text',
                label: 'text title',
                hasArticle: true,
                url: '/components/forms/text',
                children: [],
              },
              {
                id: 'components_forms_number',
                label: 'number title',
                hasArticle: true,
                url: '/components/forms/number',
                children: [],
              },
            ],
          },
          {
            id: 'controls',
            label: 'controls title',
            hasArticle: true,
            url: '/controls',
            children: [
              {
                id: 'controls_buttons',
                label: 'buttons',
                hasArticle: false,
                url: '/controls/buttons',
                children: [
                  {
                    id: 'controls_buttons_button',
                    label: 'button title',
                    hasArticle: true,
                    url: '/controls/buttons/button',
                    children: [],
                  },
                  {
                    id: 'controls_buttons_checkbox',
                    label: 'checkbox title',
                    hasArticle: true,
                    url: '/controls/buttons/checkbox',
                    children: [],
                  },
                ],
              },
              {
                id: 'controls_radio',
                label: 'radio',
                hasArticle: false,
                url: '/controls/radio',
                children: [
                  {
                    id: 'controls_radio_radio_button',
                    label: 'radio-button title',
                    hasArticle: true,
                    url: '/controls/radio/radio-button',
                    children: [],
                  },
                  {
                    id: 'controls_radio_radio_flag',
                    label: 'radio-flag title',
                    hasArticle: true,
                    url: '/controls/radio/radio-flag',
                    children: [],
                  },
                  {
                    id: 'controls_radio_some_secret_weapon',
                    label: 'secret weapon title',
                    hasArticle: true,
                    url: '/controls/radio/some/secret/weapon',
                    children: [],
                  },
                ],
              },
            ],
          },
        ],
      },
      chunks: [
        {
          id: 'intro',
          path: '/system-root/projects/awesome/dist/docs/intro.js',
          url: '/intro',
        },
        {
          id: 'intro_author',
          path: '/system-root/projects/awesome/dist/docs/intro/author.js',
          url: '/intro/author',
        },
        {
          id: 'intro_thanks',
          path: '/system-root/projects/awesome/dist/docs/intro/thanks.js',
          url: '/intro/thanks',
        },
        {
          id: 'components_forms_text',
          path: '/system-root/projects/awesome/dist/docs/components/forms/text.js',
          url: '/components/forms/text',
        },
        {
          id: 'components_forms_number',
          path: '/system-root/projects/awesome/dist/docs/components/forms/number.js',
          url: '/components/forms/number',
        },
        {
          id: 'controls',
          path: '/system-root/projects/awesome/dist/docs/controls/controls.js',
          url: '/controls',
        },
        {
          id: 'controls_buttons_button',
          path: '/system-root/projects/awesome/dist/docs/controls/buttons/button.js',
          url: '/controls/buttons/button',
        },
        {
          id: 'controls_buttons_checkbox',
          path: '/system-root/projects/awesome/dist/docs/controls/buttons/checkbox.js',
          url: '/controls/buttons/checkbox',
        },
        {
          id: 'controls_radio_radio_button',
          path: '/system-root/projects/awesome/dist/docs/controls/radio/radio-button.js',
          url: '/controls/radio/radio-button',
        },
        {
          id: 'controls_radio_radio_flag',
          path: '/system-root/projects/awesome/dist/docs/controls/radio/radio-flag.js',
          url: '/controls/radio/radio-flag',
        },
        {
          id: 'controls_radio_some_secret_weapon',
          path: '/system-root/projects/awesome/dist/docs/controls/radio/some/secret/weapon.js',
          url: '/controls/radio/some/secret/weapon',
        },
      ],
    }
  );
});

test.run();
