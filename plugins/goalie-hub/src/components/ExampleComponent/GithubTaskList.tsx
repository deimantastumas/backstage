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

import React, { ChangeEvent, useCallback, useEffect, useState } from 'react';
import useAsync from 'react-use/lib/useAsync';

import {
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Card,
  CardContent,
  CardHeader,
  CardActions,
  Avatar,
  Button,
  ListItemSecondaryAction,
  IconButton,
  TextField,
  Box,
  Typography,
  makeStyles,
} from '@material-ui/core';
import GitHubIcon from '@material-ui/icons/GitHub';
import LaunchIcon from '@material-ui/icons/Launch';
import ArrowBackIosIcon from '@material-ui/icons/ArrowBackIos';
import ArrowForwardIosIcon from '@material-ui/icons/ArrowForwardIos';

import { Progress } from '@backstage/core-components';

import { useGithubApi } from './api';

const useStyles = makeStyles({
  card: {
    height: '100%',
  },
});

// TODO: renderSubheader, renderItem
export const GithubTaskList = (props: any) => {
  const classes = useStyles();
  const githubApi = useGithubApi();

  const { title, defaultQuery = '', limit = 5 } = props;

  const [page, setPage] = useState(1);
  const [query, setQuery] = useState(defaultQuery);

  useEffect(() => {
    setPage(1);
  }, [query, setPage]);

  const { value } = useAsync(async () => {
    return await githubApi?.search({ query, page, limit });
  }, [githubApi, query, page, limit]);

  const handleQueryChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setQuery(event.target.value);
    },
    [setQuery],
  );

  const handlePrevClick = useCallback(() => {
    setPage(prevPage => prevPage - 1);
  }, [setPage]);

  const handleNextClick = useCallback(() => {
    setPage(prevPage => prevPage + 1);
  }, [setPage]);

  if (!value) {
    return <Progress />;
  }

  const { items, total_count: totalCount } = value;
  const lastPage = Math.ceil(totalCount / limit);

  return (
    <Card className={classes.card}>
      <CardHeader
        title={
          <Box
            display="grid"
            alignItems="center"
            gridAutoFlow="column"
            gridTemplateColumns="auto auto 1fr"
            gridGap="1rem"
          >
            <GitHubIcon fontSize="large" />
            <Typography variant="subtitle1" noWrap>
              Github: {title} ({totalCount})
            </Typography>
            <TextField
              size="small"
              variant="outlined"
              type="search"
              value={query}
              onChange={handleQueryChange}
              placeholder="Search for tasks..."
            />
          </Box>
        }
        disableTypography
      />
      <CardContent>
        <List disablePadding>
          {items?.map((item: any) => (
            <ListItem key={item.id} alignItems="flex-start" divider>
              <ListItemAvatar>
                <Avatar alt={item.user.login} src={item.user.avatar_url} />
              </ListItemAvatar>
              <ListItemText
                primary={item.title}
                primaryTypographyProps={{ noWrap: true }}
                secondary={`#${item.number} opened by ${item.user.login}`}
              />
              <ListItemSecondaryAction>
                <IconButton
                  color="primary"
                  href={item.html_url}
                  target="_blank"
                >
                  <LaunchIcon />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
      </CardContent>
      <CardActions>
        <Button
          startIcon={<ArrowBackIosIcon />}
          onClick={handlePrevClick}
          disabled={page === 1}
        >
          Prev
        </Button>
        <Button
          endIcon={<ArrowForwardIosIcon />}
          onClick={handleNextClick}
          disabled={page === lastPage}
        >
          Next
        </Button>
      </CardActions>
    </Card>
  );
};
