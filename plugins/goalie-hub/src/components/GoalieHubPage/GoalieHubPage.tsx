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

import React from 'react';

import { Grid } from '@material-ui/core';

import {
  Header,
  Page,
  HeaderLabel,
  Content,
  ContentHeader,
  SupportButton,
} from '@backstage/core-components';

import { GithubTaskList } from './GithubTaskList';
import { SlackTaskList } from './SlackTaskList';

export const GoalieHubPage = () => (
  <Page themeId="tool">
    <Header title="Welcome to goalie-hub!" subtitle="Optional subtitle">
      <HeaderLabel label="Owner" value="Team X" />
      <HeaderLabel label="Lifecycle" value="Alpha" />
    </Header>
    <Content>
      <ContentHeader title="My Workspace">
        <SupportButton>A description of your plugin goes here.</SupportButton>
      </ContentHeader>
      <Grid container spacing={2} direction="row" alignItems="stretch">
        <Grid item xs={12} md={6}>
          <GithubTaskList
            title="Pull Requests"
            defaultQuery="repo:backstage/backstage type:pr state:open label:search,homepage"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <GithubTaskList
            title="Issues"
            defaultQuery="repo:backstage/backstage type:issue state:open label:search,homepage"
          />
        </Grid>
      </Grid>
      <Grid container spacing={2} direction="row" alignItems="stretch">
        <Grid item xs={12} md={6}>
          <SlackTaskList title="Messages" defaultQuery="Backstage" />
        </Grid>
      </Grid>
    </Content>
  </Page>
);
