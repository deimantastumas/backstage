/*
 * Copyright 2020 Spotify AB
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { getVoidLogger } from '@backstage/backend-common';
import { LocationSpec } from '@backstage/catalog-model';
import { GithubDiscoveryProcessor, parseUrl } from './GithubDiscoveryProcessor';
import { getOrganizationRepositories } from './github';

jest.mock('./github');
const mockGetOrganizationRepositories = getOrganizationRepositories as jest.MockedFunction<
  typeof getOrganizationRepositories
>;

describe('GithubOrgReaderProcessor', () => {
  describe('parseUrl', () => {
    it('parses well formed URLs', () => {
      expect(
        parseUrl('https://github.com/foo/proj/blob/master/catalog.yaml'),
      ).toEqual({
        org: 'foo',
        repoSearchPath: /proj/,
        catalogPath: 'blob/master/catalog.yaml',
      });
      expect(
        parseUrl('https://github.com/foo/proj*/blob/master/catalog.yaml'),
      ).toEqual({
        org: 'foo',
        repoSearchPath: /proj.*/,
        catalogPath: 'blob/master/catalog.yaml',
      });
    });

    it('throws on incorrectly formed URLs', () => {
      expect(() => parseUrl('https://github.com')).toThrow();
      expect(() => parseUrl('https://github.com//')).toThrow();
      expect(() => parseUrl('https://github.com/foo')).toThrow();
      expect(() => parseUrl('https://github.com//foo')).toThrow();
      expect(() => parseUrl('https://github.com/org/teams')).toThrow();
      expect(() => parseUrl('https://github.com/org//teams')).toThrow();
    });
  });

  describe('reject unrelated entries', () => {
    it('rejects unknown types', async () => {
      const processor = new GithubDiscoveryProcessor({
        providers: [
          {
            target: 'https://github.com',
            apiBaseUrl: 'https://api.github.com',
          },
        ],
        logger: getVoidLogger(),
      });
      const location: LocationSpec = {
        type: 'not-github-discovery',
        target: 'https://github.com',
      };
      await expect(
        processor.readLocation(location, false, () => {}),
      ).resolves.toBeFalsy();
    });

    it('rejects unknown targets', async () => {
      const processor = new GithubDiscoveryProcessor({
        providers: [
          {
            target: 'https://github.com',
            apiBaseUrl: 'https://api.github.com',
          },
        ],
        logger: getVoidLogger(),
      });
      const location: LocationSpec = {
        type: 'github-discovery',
        target: 'https://not.github.com/apa',
      };
      await expect(
        processor.readLocation(location, false, () => {}),
      ).rejects.toThrow(
        /There is no GitHub Org provider that matches https:\/\/not.github.com\/apa/,
      );
    });
  });

  describe('handles repositories', () => {
    const processor = new GithubDiscoveryProcessor({
      providers: [
        {
          target: 'https://github.com',
          apiBaseUrl: 'https://api.github.com',
        },
      ],
      logger: getVoidLogger(),
    });

    beforeEach(() => {
      mockGetOrganizationRepositories.mockClear();
    });

    it('output all repositories', async () => {
      const location: LocationSpec = {
        type: 'github-discovery',
        target: 'https://github.com/backstage/*/blob/master/catalog.yaml',
      };
      mockGetOrganizationRepositories.mockResolvedValueOnce({
        repositories: [
          { name: 'backstage', url: 'https://github.com/backstage/backstage' },
          { name: 'demo', url: 'https://github.com/backstage/demo' },
        ],
      });
      const emitter = jest.fn();

      await processor.readLocation(location, false, emitter);

      expect(emitter).toHaveBeenCalledWith({
        type: 'location',
        location: {
          type: 'url',
          target:
            'https://github.com/backstage/backstage/blob/master/catalog.yaml',
        },
        optional: false,
      });
      expect(emitter).toHaveBeenCalledWith({
        type: 'location',
        location: {
          type: 'url',
          target: 'https://github.com/backstage/demo/blob/master/catalog.yaml',
        },
        optional: false,
      });
    });

    it('filter unrelated repositories', async () => {
      const location: LocationSpec = {
        type: 'github-discovery',
        target:
          'https://github.com/backstage/techdocs-*/blob/master/catalog.yaml',
      };
      mockGetOrganizationRepositories.mockResolvedValueOnce({
        repositories: [
          { name: 'backstage', url: 'https://github.com/backstage/backstage' },
          {
            name: 'techdocs-cli',
            url: 'https://github.com/backstage/techdocs-cli',
          },
          {
            name: 'techdocs-container',
            url: 'https://github.com/backstage/techdocs-container',
          },
        ],
      });
      const emitter = jest.fn();

      await processor.readLocation(location, false, emitter);

      expect(emitter).toHaveBeenCalledWith({
        type: 'location',
        location: {
          type: 'url',
          target:
            'https://github.com/backstage/techdocs-cli/blob/master/catalog.yaml',
        },
        optional: false,
      });
      expect(emitter).toHaveBeenCalledWith({
        type: 'location',
        location: {
          type: 'url',
          target:
            'https://github.com/backstage/techdocs-container/blob/master/catalog.yaml',
        },
        optional: false,
      });
    });
  });
});
