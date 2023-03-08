/*
 * Copyright 2023 The Backstage Authors
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

import { useMemo } from 'react';
import useAsync from 'react-use/lib/useAsync';

import {
  configApiRef,
  githubAuthApiRef,
  useApi,
} from '@backstage/core-plugin-api';

class GithubApi {
  private token: string;
  private backendUrl: string;

  private constructor(token: string, backendUrl: string) {
    this.token = token;
    this.backendUrl = backendUrl;
  }

  static fromConfig({
    token,
    backendUrl,
  }: {
    token: string;
    backendUrl: string;
  }) {
    return new GithubApi(token, backendUrl);
  }

  public async search({
    query: q,
    page = 1,
    limit: per_page = 5,
  }: {
    query: string;
    page?: number;
    limit?: number;
  }) {
    const response = await fetch(
      `${this.backendUrl}/api/proxy/github/search/issues?q=${encodeURIComponent(
        q,
      )}&page=${page}&per_page=${per_page}`,
      {
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${this.token}`,
          'X-GitHub-Api-Version': '2022-11-28',
        },
      },
    );

    return response.json();
  }
}

export const useGithubApi = () => {
  const configApi = useApi(configApiRef);
  const githubAuthApi = useApi(githubAuthApiRef);

  const { value: token } = useAsync(async () => {
    return await githubAuthApi.getAccessToken(['read:user', 'repo']);
  }, [githubAuthApi]);

  return useMemo(() => {
    if (!token) return null;
    const backendUrl = configApi.getString('backend.baseUrl');
    return GithubApi.fromConfig({ token, backendUrl });
  }, [token, configApi]);
};
